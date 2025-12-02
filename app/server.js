require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const axios = require('axios');
const { ConfidentialClientApplication } = require('@azure/msal-node');

const app = express();
const PORT = process.env.PORT || 3000;

// Queue system for managing concurrent Excel writes
const excelWriteQueue = [];
let isProcessingQueue = false;
let queueStats = {
  totalProcessed: 0,
  totalErrors: 0,
  lastProcessedAt: null,
  maxQueueSize: 0
};

// Process queue one submission at a time to prevent concurrency conflicts
const processQueue = async () => {
  console.log(`[${new Date().toISOString()}] QUEUE: processQueue() called. isProcessing: ${isProcessingQueue}, queueLength: ${excelWriteQueue.length}`);
  
  if (isProcessingQueue || excelWriteQueue.length === 0) {
    console.log(`[${new Date().toISOString()}] QUEUE: Early return - already processing or queue empty`);
    return;
  }
  
  console.log(`[${new Date().toISOString()}] QUEUE: Setting isProcessingQueue = true`);
  isProcessingQueue = true;
  const queueSize = excelWriteQueue.length;
  queueStats.maxQueueSize = Math.max(queueStats.maxQueueSize, queueSize);
  
  console.log(`[${new Date().toISOString()}] QUEUE: Starting to process ${queueSize} items`);
  
  while (excelWriteQueue.length > 0) {
    console.log(`[${new Date().toISOString()}] QUEUE: About to shift from array. Current length: ${excelWriteQueue.length}`);
    const { data, resolve, reject, timestamp, requestId } = excelWriteQueue.shift();
    console.log(`[${new Date().toISOString()}] QUEUE: Successfully shifted request ${requestId}. New length: ${excelWriteQueue.length}`);
    
    const waitTime = Date.now() - timestamp;
    
    console.log(`[${new Date().toISOString()}] QUEUE: Processing request ${requestId}. Wait time: ${waitTime}ms`);
    
    if (waitTime > 60000) { // 1 minute timeout
      console.warn(`[${new Date().toISOString()}] QUEUE: Request ${requestId} timed out after ${waitTime}ms`);
      reject(new Error('Queue timeout'));
      queueStats.totalErrors++;
      continue;
    }
    
    try {
      console.log(`[${new Date().toISOString()}] QUEUE: Starting Excel save for request ${requestId}`);
      await saveSurveyToExcel(data);
      console.log(`[${new Date().toISOString()}] QUEUE: Request ${requestId} completed successfully`);
      resolve();
      queueStats.totalProcessed++;
      queueStats.lastProcessedAt = new Date().toISOString();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] QUEUE: Request ${requestId} failed:`, error);
      reject(error);
      queueStats.totalErrors++;
    }
  }
  
  console.log(`[${new Date().toISOString()}] QUEUE: Setting isProcessingQueue = false`);
  isProcessingQueue = false;
};

// Add submission to queue
const queueExcelWrite = (data) => {
  return new Promise((resolve, reject) => {
    const currentTime = Date.now();
    const requestId = Math.random().toString(36).substr(2, 9);
    
    console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: Starting queue add. Current queue size: ${excelWriteQueue.length}`);
    
    // Prevent queue from getting too large
    if (excelWriteQueue.length > 100) {
      console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: Queue full, rejecting`);
      reject(new Error('Queue is full, please try again later'));
      return;
    }
    
    const queueItem = { 
      data, 
      resolve, 
      reject, 
      timestamp: currentTime,
      requestId: requestId
    };
    
    console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: About to push to array...`);
    excelWriteQueue.push(queueItem);
    console.log(`[${new Date().toISOString()}] REQUEST ${requestId}: Successfully added to queue. New queue size: ${excelWriteQueue.length}`);
    
    processQueue(); // Start processing if not already running
  });
};

// Azure/SharePoint Configuration
const getTenantAuthority = () => {
  if (process.env.AZURE_TENANT_ID) {
    return `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`;
  }
  
  // Try to extract tenant from SharePoint URL
  const siteUrl = process.env.SHAREPOINT_SITE_URL || '';
  const match = siteUrl.match(/https:\/\/([^.]+)\.sharepoint\.com/);
  
  if (match) {
    const tenantName = match[1];
    console.log(`Using tenant authority for: ${tenantName}`);
    return `https://login.microsoftonline.com/${tenantName}.onmicrosoft.com`;
  }
  
  // Fallback
  return 'https://login.microsoftonline.com/atalossaal.onmicrosoft.com';
};

const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID,
    clientSecret: process.env.AZURE_CLIENT_SECRET,
    authority: getTenantAuthority()
  }
};

const cca = new ConfidentialClientApplication(msalConfig);

// Function to get access token
async function getAccessToken(scope = 'https://graph.microsoft.com/.default') {
  const clientCredentialRequest = {
    scopes: [scope],
  };

  try {
    console.log('Attempting to acquire token with config:', {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: msalConfig.auth.authority,
      hasSecret: !!process.env.AZURE_CLIENT_SECRET,
      scope: scope
    });
    
    const response = await cca.acquireTokenByClientCredential(clientCredentialRequest);
    console.log('Token acquired successfully');
    return response.accessToken;
  } catch (error) {
    console.error('Error acquiring token:', {
      error: error.message,
      errorCode: error.errorCode,
      errorDescription: error.errorDescription,
      correlationId: error.correlationId
    });
    throw error;
  }
}

// Function to make Graph API calls
async function callGraphAPI(endpoint, method = 'GET', data = null, customHeaders = {}) {
  const token = await getAccessToken();
  
  const config = {
    method,
    url: `https://graph.microsoft.com/v1.0${endpoint}`,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...customHeaders
    }
  };
  
  if (data && (method === 'POST' || method === 'PATCH')) {
    config.data = data;
  }
  
  const response = await axios(config);
  return response.data;
}

// Security middleware
app.use(helmet());

// Trust proxy for rate limiting (since we're behind nginx)
app.set('trust proxy', 1);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000', 
    'http://localhost:5500',
    'https://ataloss.org',           // Add your domain
    'https://www.ataloss.org',       // Add www version
    // Add any other domains you need
  ], 
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Production security: Disable debug endpoints in production
const isProduction = process.env.NODE_ENV === 'production';
const enableDebugEndpoints = process.env.ENABLE_DEBUG_ENDPOINTS === 'true';

// Security middleware for debug endpoints
const debugAuth = (req, res, next) => {
  if (isProduction && !enableDebugEndpoints) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  
  // Optional: Add basic auth for debug endpoints in production
  const debugPassword = process.env.DEBUG_PASSWORD;
  if (isProduction && debugPassword) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${debugPassword}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  next();
};

// Queue monitoring endpoint (always available for operational monitoring)
app.get('/api/queue-status', (req, res) => {
  res.json({
    queueSize: excelWriteQueue.length,
    isProcessing: isProcessingQueue,
    stats: queueStats,
    maxQueueSize: queueStats.maxQueueSize,
    successRate: queueStats.totalProcessed > 0 ? 
      ((queueStats.totalProcessed / (queueStats.totalProcessed + queueStats.totalErrors)) * 100).toFixed(2) + '%' : 
      '100%'
  });
});

// Survey submission endpoint
app.post('/api/survey', async (req, res) => {
  try {
    const surveyData = req.body;
    
    // Add timestamp if not present
    if (!surveyData.timestamp) {
      surveyData.timestamp = new Date().toISOString();
    }
    
    // Validate required fields
    if (!surveyData.path && !surveyData.page_url) {
      return res.status(400).json({ error: 'Page URL or path is required' });
    }
    
    // Queue the Excel write to prevent concurrency conflicts
    // This ensures only one Excel write happens at a time
    queueExcelWrite(surveyData).catch(error => {
      console.error('Queued Excel write failed:', error);
    });

    // Return immediate success response
    res.json({ 
      success: true, 
      message: 'Survey data received and queued for processing',
      timestamp: surveyData.timestamp,
      queuePosition: excelWriteQueue.length + 1
    });

    console.log('Survey data received and queued for SharePoint save:', {
      surveyId: surveyData.surveyId,
      stage: surveyData.submissionStage,
      trigger: surveyData.trigger,
      timestamp: surveyData.timestamp
    });
  } catch (error) {
    console.error('Error processing survey:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to save survey data to SharePoint Excel (used by queue)
async function saveSurveyToExcel(data) {
  try {
    // Get site ID using the correct format
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    let site;
    
    try {
      const hostname = new URL(siteUrl).hostname;
      const sitePath = '/sites/WebsiteEvaluation';
      site = await callGraphAPI(`/sites/${hostname}:${sitePath}`);
    } catch (error) {
      site = await callGraphAPI(`/sites/atalossaal.sharepoint.com:/sites/WebsiteEvaluation`);
    }
    
    // Get the drive and file info using the working approach
    const drives = await callGraphAPI(`/sites/${site.id}/drives`);
    const drive = drives.value.find(d => d.name === 'Documents' || d.webUrl.includes('Shared%20Documents'));
    
    if (!drive) {
      throw new Error('Documents drive not found');
    }
    
    const fileInfo = await callGraphAPI(`/drives/${drive.id}/root:/Website Evaluation.xlsx`);
    
    console.log('Using drive ID:', drive.id);
    console.log('Using file ID:', fileInfo.id);
    
    // Create a workbook session
    const session = await callGraphAPI(`/drives/${drive.id}/items/${fileInfo.id}/workbook/createSession`, 'POST', {
      persistChanges: true
    });
    
    console.log('Created workbook session:', session.id);
    
    // Prepare row data - flatten the survey data into columns
    // Send date in a format Excel definitely recognizes as date/time
    let timestamp;
    if (data.timestamp) {
      const date = new Date(data.timestamp);
      // Format as "YYYY-MM-DD HH:MM:SS" which Excel recognizes as date/time
      timestamp = date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
      console.log('Using client timestamp:', data.timestamp);
      console.log('Formatted for Excel:', timestamp);
    } else {
      const date = new Date();
      timestamp = date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
      console.log('Using current server time, formatted:', timestamp);
    }
    
    const rowData = {
      values: [[
        timestamp,  // Send as "YYYY-MM-DD HH:MM:SS" format
        data.surveyId || '',
        data.submissionStage || '',
        data.trigger || '',
        data.path || data.page_url || '',
        data.selected || '',
        data.label || '',
        data.stars || '',
        data.audience || '',
        data.heardWhere || '',
        data.intent || '',
        data.ageGroup || '',
        data.gender || '',
        data.ethnicity || '',
        Array.isArray(data.barriers) ? data.barriers.join(', ') : (data.barriers || ''),
        data.comments || '',
        data.ua || data.user_agent || '',
        data.resubmission || false,
        data.resubmissionCount || 0,
        data.exited || false,
        data.userFingerprint || '',
        data.sessionId || ''
      ]]
    };
    
    const worksheetName = process.env.WORKSHEET_NAME || 'Sheet1';
    const tableName = process.env.TABLE_NAME || 'Table1';
    
    console.log(`Adding row to ${tableName} in ${worksheetName}:`, JSON.stringify(rowData, null, 2));
    
    // Add row to table using the session
    await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${worksheetName}')/tables('${tableName}')/rows`,
      'POST',
      rowData,
      { 'workbook-session-id': session.id }
    );
    
    // Close the session
    await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/closeSession`,
      'POST',
      {},
      { 'workbook-session-id': session.id }
    );
    
    console.log('Survey data successfully added to SharePoint Excel file');
    
  } catch (error) {
    console.error('Error saving to SharePoint Excel:', error);
    if (error.response?.data) {
      console.error('Response details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Function to create Excel file if it doesn't exist
async function createExcelFile(siteId) {
  try {
    console.log('Creating Excel file with headers...');
    
    // Use Microsoft Graph to create a new workbook
    const workbookData = {
      name: "Website Evaluation.xlsx"
    };
    
    // Create workbook in SharePoint
    const createResult = await callGraphAPI(
      `/sites/${siteId}/drive/root:/Shared Documents:/children`,
      'POST',
      {
        name: "Website Evaluation.xlsx",
        file: {}
      }
    );
    
    console.log('Excel file created successfully:', createResult.name);
    
    // Add headers to the first row using Graph API
    const headersData = {
      values: [[
        'Timestamp', 'Survey ID', 'Submission Stage', 'Trigger', 'Page Path',
        'Rating Selected', 'Rating Label', 'Stars', 'Audience', 'Heard Where',
        'Intent', 'Age Group', 'Gender', 'Ethnicity', 'Barriers',
        'Comments', 'User Agent', 'Is Resubmission', 'Resubmission Count', 'Exited Early',
        'User Fingerprint', 'Session ID'
      ]]
    };
    
    // Add headers to the worksheet
    const worksheetName = process.env.WORKSHEET_NAME || 'Sheet1';
    const excelFilePath = process.env.EXCEL_FILE_PATH || '/Shared Documents/Website Evaluation.xlsx';
    
    await callGraphAPI(
      `/sites/${siteId}/drive/root:${excelFilePath}:/workbook/worksheets('${worksheetName}')/range(address='A1:V1')`,
      'PATCH',
      headersData
    );
    
    console.log('Headers added to Excel file successfully');
    return createResult;
  } catch (error) {
    console.error('Error creating Excel file:', error);
    throw error;
  }
}

// Function to create Excel table if it doesn't exist
async function createExcelTable(siteId) {
  try {
    console.log('Creating Excel table...');
    
    const tableData = {
      address: "A1:V1",
      hasHeaders: true,
      values: [[
        'Timestamp', 'Survey ID', 'Submission Stage', 'Trigger', 'Page Path',
        'Rating Selected', 'Rating Label', 'Stars', 'Audience', 'Heard Where',
        'Intent', 'Age Group', 'Gender', 'Ethnicity', 'Barriers',
        'Comments', 'User Agent', 'Is Resubmission', 'Resubmission Count', 'Exited Early',
        'User Fingerprint', 'Session ID'
      ]]
    };

    const result = await callGraphAPI(
      `/sites/${siteId}/drive/root:${excelFilePath}:/workbook/worksheets('${worksheetName}')/tables`,
      'POST',
      tableData
    );
    
    console.log('Excel table created successfully');
    return result;
  } catch (error) {
    console.error('Error creating Excel table:', error);
    throw error;
  }
}
// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Website Exit Survey API - SharePoint Integration',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Debug configuration endpoint (protected in production)
app.get('/api/debug-config', debugAuth, (req, res) => {
  res.status(200).json({
    hasClientId: !!process.env.AZURE_CLIENT_ID,
    hasClientSecret: !!process.env.AZURE_CLIENT_SECRET,
    hasTenantId: !!process.env.AZURE_TENANT_ID,
    authority: msalConfig.auth.authority,
    sharepointUrl: process.env.SHAREPOINT_SITE_URL,
    clientIdStart: process.env.AZURE_CLIENT_ID?.substring(0, 8) + '...',
    environment: process.env.NODE_ENV
  });
});

// Debug endpoint to test Excel file access (protected in production)
app.get('/api/debug-excel', debugAuth, async (req, res) => {
  try {
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    const hostname = new URL(siteUrl).hostname;
    const sitePath = '/sites/WebsiteEvaluation';
    
    // Get the site
    const site = await callGraphAPI(`/sites/${hostname}:${sitePath}`);
    
    // Get the drive (document library)
    const drives = await callGraphAPI(`/sites/${site.id}/drives`);
    
    // Look for the Excel file
    const filePath = process.env.EXCEL_FILE_PATH; // "/Shared Documents/Website Evaluation.xlsx"
    const drive = drives.value.find(d => d.name === 'Documents' || d.webUrl.includes('Shared%20Documents'));
    
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'Documents drive not found',
        availableDrives: drives.value.map(d => ({ name: d.name, webUrl: d.webUrl }))
      });
    }
    
    // Try to get the Excel file
    const encodedPath = encodeURIComponent('Website Evaluation.xlsx');
    const fileInfo = await callGraphAPI(`/drives/${drive.id}/root:/Website Evaluation.xlsx`);
    
    res.status(200).json({
      success: true,
      message: 'Excel file found',
      site: { id: site.id, name: site.displayName },
      drive: { id: drive.id, name: drive.name },
      file: { id: fileInfo.id, name: fileInfo.name, webUrl: fileInfo.webUrl }
    });
    
  } catch (error) {
    console.error('Excel file access test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Excel file access failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Debug endpoint to test workbook session creation (protected in production)
app.get('/api/debug-workbook', debugAuth, async (req, res) => {
  try {
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    const hostname = new URL(siteUrl).hostname;
    const sitePath = '/sites/WebsiteEvaluation';
    
    // Get the site
    const site = await callGraphAPI(`/sites/${hostname}:${sitePath}`);
    
    // Get file info using the method that works from debug-excel
    const drives = await callGraphAPI(`/sites/${site.id}/drives`);
    const drive = drives.value.find(d => d.name === 'Documents' || d.webUrl.includes('Shared%20Documents'));
    
    if (!drive) {
      return res.status(404).json({
        success: false,
        error: 'Documents drive not found'
      });
    }
    
    const fileInfo = await callGraphAPI(`/drives/${drive.id}/root:/Website Evaluation.xlsx`);
    
    let results = {
      site: { id: site.id, name: site.displayName },
      drive: { id: drive.id, name: drive.name },
      file: { id: fileInfo.id, name: fileInfo.name },
      tests: []
    };
    
    // Test 1: Try to access workbook using drive ID and file path
    try {
      const workbook = await callGraphAPI(`/drives/${drive.id}/root:/Website Evaluation.xlsx:/workbook`);
      results.tests.push({
        test: 'Workbook access via drive ID + path',
        success: true,
        data: workbook
      });
    } catch (error) {
      results.tests.push({
        test: 'Workbook access via drive ID + path',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    // Test 2: Try to access workbook by file ID directly
    try {
      const workbook = await callGraphAPI(`/drives/${drive.id}/items/${fileInfo.id}/workbook`);
      results.tests.push({
        test: 'Workbook access via file ID',
        success: true,
        data: workbook
      });
    } catch (error) {
      results.tests.push({
        test: 'Workbook access via file ID',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    // Test 3: Try to create session using drive ID + path
    try {
      const session = await callGraphAPI(`/drives/${drive.id}/root:/Website Evaluation.xlsx:/workbook/createSession`, 'POST', {
        persistChanges: false
      });
      results.tests.push({
        test: 'Create session via drive ID + path',
        success: true,
        sessionId: session.id
      });
      
      // If session works, try to access tables
      const worksheetName = process.env.WORKSHEET_NAME || 'Sheet1';
      const excelFileName = process.env.EXCEL_FILE_PATH?.split('/').pop() || 'Website Evaluation.xlsx';
      
      try {
        const tables = await callGraphAPI(`/drives/${drive.id}/root:/${excelFileName}:/workbook/worksheets('${worksheetName}')/tables`, 'GET', null, {
          'workbook-session-id': session.id
        });
        results.tests.push({
          test: 'Access tables with session',
          success: true,
          tables: tables.value.map(t => ({ id: t.id, name: t.name, address: t.address }))
        });
      } catch (error) {
        results.tests.push({
          test: 'Access tables with session',
          success: false,
          error: error.response?.data || error.message
        });
      }
      
    } catch (error) {
      results.tests.push({
        test: 'Create session via drive ID + path',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    // Test 4: Try to create session using file ID
    try {
      const session = await callGraphAPI(`/drives/${drive.id}/items/${fileInfo.id}/workbook/createSession`, 'POST', {
        persistChanges: false
      });
      results.tests.push({
        test: 'Create session via file ID',
        success: true,
        sessionId: session.id
      });
      
      // If session works, try to access tables
      const worksheetName = process.env.WORKSHEET_NAME || 'Sheet1';
      try {
        const tables = await callGraphAPI(`/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${worksheetName}')/tables`, 'GET', null, {
          'workbook-session-id': session.id
        });
        results.tests.push({
          test: 'Access tables via file ID with session',
          success: true,
          tables: tables.value.map(t => ({ id: t.id, name: t.name, address: t.address }))
        });
      } catch (error) {
        results.tests.push({
          test: 'Access tables via file ID with session',
          success: false,
          error: error.response?.data || error.message
        });
      }
      
    } catch (error) {
      results.tests.push({
        test: 'Create session via file ID',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Workbook tests completed',
      results: results,
      recommendation: results.tests.some(t => t.success) ? 
        'Found working method - use this approach' : 
        'All workbook access methods failed. This may be a permissions or file format issue.'
    });
    
  } catch (error) {
    console.error('Workbook test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Workbook test failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Debug endpoint to test SharePoint scope and permissions (protected in production)
app.get('/api/debug-permissions', debugAuth, async (req, res) => {
  try {
    let results = {
      appInfo: {
        clientId: process.env.AZURE_CLIENT_ID,
        tenantId: process.env.AZURE_TENANT_ID
      },
      tests: []
    };
    
    // Test 1: Check what sites we can access
    try {
      const sites = await callGraphAPI('/sites?$top=10');
      results.tests.push({
        test: 'List all sites',
        success: true,
        siteCount: sites.value.length,
        sites: sites.value.map(s => ({
          name: s.displayName,
          webUrl: s.webUrl,
          id: s.id
        }))
      });
    } catch (error) {
      results.tests.push({
        test: 'List all sites',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    // Test 2: Try to access a different SharePoint site (if any)
    try {
      const rootSite = await callGraphAPI('/sites/root');
      results.tests.push({
        test: 'Access root site',
        success: true,
        rootSite: {
          name: rootSite.displayName,
          webUrl: rootSite.webUrl
        }
      });
    } catch (error) {
      results.tests.push({
        test: 'Access root site',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    // Test 3: Try to access our specific site
    try {
      const ourSite = await callGraphAPI('/sites/atalossaal.sharepoint.com:/sites/WebsiteEvaluation');
      results.tests.push({
        test: 'Access our specific site',
        success: true,
        site: {
          name: ourSite.displayName,
          webUrl: ourSite.webUrl
        }
      });
    } catch (error) {
      results.tests.push({
        test: 'Access our specific site',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    // Test 4: Check drives in our site
    try {
      const ourSite = await callGraphAPI('/sites/atalossaal.sharepoint.com:/sites/WebsiteEvaluation');
      const drives = await callGraphAPI(`/sites/${ourSite.id}/drives`);
      results.tests.push({
        test: 'List drives in our site',
        success: true,
        driveCount: drives.value.length,
        drives: drives.value.map(d => ({
          name: d.name,
          driveType: d.driveType,
          webUrl: d.webUrl
        }))
      });
    } catch (error) {
      results.tests.push({
        test: 'List drives in our site',
        success: false,
        error: error.response?.data || error.message
      });
    }
    
    // Test 5: Check current token permissions
    try {
      const token = await getAccessToken();
      // Decode JWT to see scopes (basic decode, not verification)
      const tokenParts = token.split('.');
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      
      results.tests.push({
        test: 'Token analysis',
        success: true,
        tokenInfo: {
          appId: payload.appid,
          roles: payload.roles || [],
          scopes: payload.scp || 'N/A',
          audience: payload.aud,
          issuer: payload.iss
        }
      });
    } catch (error) {
      results.tests.push({
        test: 'Token analysis',
        success: false,
        error: error.message
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Permission scope analysis completed',
      results: results,
      recommendation: 'Review the sites and drives accessible to ensure proper scope limitation'
    });
    
  } catch (error) {
    console.error('Permission check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Permission check failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Debug endpoint to test SharePoint-specific scope (protected in production)
app.get('/api/debug-sharepoint-scope', debugAuth, async (req, res) => {
  try {
    // Try to get token with SharePoint-specific scope
    const sharepointToken = await getAccessToken('https://atalossaal.sharepoint.com/.default');
    
    // Test direct SharePoint API call
    const response = await axios.get('https://atalossaal.sharepoint.com/_api/web', {
      headers: {
        'Authorization': `Bearer ${sharepointToken}`,
        'Accept': 'application/json'
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'SharePoint-specific scope test successful',
      data: response.data
    });
  } catch (error) {
    console.error('SharePoint scope test failed:', error);
    res.status(500).json({
      success: false,
      error: 'SharePoint scope test failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Debug endpoint to test basic Graph API access (protected in production)
app.get('/api/debug-graph', debugAuth, async (req, res) => {
  try {
    // Test basic Graph API access with a simple endpoint that works with Files permissions
    const servicePrincipal = await callGraphAPI('/servicePrincipals?$filter=appId eq \'' + process.env.AZURE_CLIENT_ID + '\'');
    res.status(200).json({
      success: true,
      message: 'Graph API connection successful - Authentication working',
      appInfo: {
        clientId: process.env.AZURE_CLIENT_ID,
        hasData: !!servicePrincipal.value
      }
    });
  } catch (error) {
    console.error('Graph API test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Graph API connection failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Debug endpoint to list all sites (protected in production)
app.get('/api/debug-sites', debugAuth, async (req, res) => {
  try {
    // Try to list all sites in the tenant
    const sites = await callGraphAPI('/sites?search=*');
    res.status(200).json({
      success: true,
      message: 'Sites retrieved successfully',
      sitesCount: sites.value?.length || 0,
      sites: sites.value || []
    });
  } catch (error) {
    console.error('Sites listing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Sites listing failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Debug endpoint to test root site access (protected in production)
app.get('/api/debug-root', debugAuth, async (req, res) => {
  try {
    // Try to access the root site
    const rootSite = await callGraphAPI('/sites/root');
    res.status(200).json({
      success: true,
      message: 'Root site access successful',
      site: {
        id: rootSite.id,
        name: rootSite.displayName,
        url: rootSite.webUrl
      }
    });
  } catch (error) {
    console.error('Root site access failed:', error);
    res.status(500).json({
      success: false,
      error: 'Root site access failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Test SharePoint connection endpoint
app.get('/api/test-sharepoint', async (req, res) => {
  try {
    // Try different approaches to get the site
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    
    // First try: Use hostname approach
    let site;
    try {
      const hostname = new URL(siteUrl).hostname; // atalossaal.sharepoint.com
      const sitePath = '/sites/WebsiteEvaluation';
      site = await callGraphAPI(`/sites/${hostname}:${sitePath}`);
    } catch (error) {
      console.log('Hostname approach failed, trying alternative...');
      // Alternative: Try direct site name
      site = await callGraphAPI(`/sites/atalossaal.sharepoint.com:/sites/WebsiteEvaluation`);
    }
    
    res.status(200).json({
      success: true,
      message: 'SharePoint connection successful',
      site: {
        id: site.id,
        name: site.displayName,
        url: site.webUrl
      }
    });
  } catch (error) {
    console.error('SharePoint connection test failed:', error);
    res.status(500).json({
      success: false,
      error: 'SharePoint connection failed',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Helper endpoint to list worksheets and tables in the Excel file
app.get('/api/list-worksheets', debugAuth, async (req, res) => {
  try {
    // Get site and drive using the working approach
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    let site;
    try {
      const hostname = new URL(siteUrl).hostname;
      const sitePath = '/sites/WebsiteEvaluation';
      site = await callGraphAPI(`/sites/${hostname}:${sitePath}`);
    } catch (error) {
      site = await callGraphAPI(`/sites/atalossaal.sharepoint.com:/sites/WebsiteEvaluation`);
    }
    
    const drives = await callGraphAPI(`/sites/${site.id}/drives`);
    const drive = drives.value.find(d => d.name === 'Documents' || d.webUrl.includes('Shared%20Documents'));
    
    if (!drive) {
      throw new Error('Documents drive not found');
    }
    
    // Get file using the working approach
    const fileInfo = await callGraphAPI(`/drives/${drive.id}/root:/Website Evaluation.xlsx`);
    
    // Create workbook session
    const session = await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/createSession`,
      'POST',
      { persistChanges: false }
    );
    
    // Get all worksheets
    const worksheets = await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets`,
      'GET',
      null,
      { 'workbook-session-id': session.id }
    );
    
    // Get tables for each worksheet
    const worksheetData = [];
    for (const ws of worksheets.value) {
      try {
        const tables = await callGraphAPI(
          `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${ws.name}')/tables`,
          'GET',
          null,
          { 'workbook-session-id': session.id }
        );
        worksheetData.push({
          worksheetName: ws.name,
          tables: tables.value.map(t => t.name)
        });
      } catch (err) {
        worksheetData.push({
          worksheetName: ws.name,
          tables: [],
          error: 'Could not retrieve tables'
        });
      }
    }
    
    // Close session
    await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/closeSession`,
      'POST',
      null,
      { 'workbook-session-id': session.id }
    );
    
    res.status(200).json({
      success: true,
      file: process.env.EXCEL_FILE_PATH,
      currentConfig: {
        WORKSHEET_NAME: process.env.WORKSHEET_NAME,
        TABLE_NAME: process.env.TABLE_NAME
      },
      worksheets: worksheetData
    });
    
  } catch (error) {
    console.error('List worksheets failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list worksheets',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Helper endpoint to copy table structure to a new sheet
app.post('/api/copy-table-structure', debugAuth, async (req, res) => {
  try {
    const { newSheetName, newTableName } = req.body;
    
    if (!newSheetName || !newTableName) {
      return res.status(400).json({
        success: false,
        error: 'Both newSheetName and newTableName are required'
      });
    }

    // Get site and drive using the working approach
    const siteUrl = process.env.SHAREPOINT_SITE_URL;
    let site;
    try {
      const hostname = new URL(siteUrl).hostname;
      const sitePath = '/sites/WebsiteEvaluation';
      site = await callGraphAPI(`/sites/${hostname}:${sitePath}`);
    } catch (error) {
      site = await callGraphAPI(`/sites/atalossaal.sharepoint.com:/sites/WebsiteEvaluation`);
    }
    
    const drives = await callGraphAPI(`/sites/${site.id}/drives`);
    const drive = drives.value.find(d => d.name === 'Documents' || d.webUrl.includes('Shared%20Documents'));
    
    if (!drive) {
      throw new Error('Documents drive not found');
    }
    
    // Get file using the working approach
    const fileInfo = await callGraphAPI(`/drives/${drive.id}/root:/Website Evaluation.xlsx`);
    
    // Create workbook session
    const session = await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/createSession`,
      'POST',
      { persistChanges: true }
    );
    
    // Get current table structure
    const currentWorksheet = process.env.WORKSHEET_NAME || 'Sheet1';
    const currentTable = process.env.TABLE_NAME || 'Table1';
    
    console.log(`Attempting to access worksheet: "${currentWorksheet}" and table: "${currentTable}"`);
    
    let tableInfo;
    try {
      tableInfo = await callGraphAPI(
        `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${currentWorksheet}')/tables('${currentTable}')`,
        'GET',
        null,
        { 'workbook-session-id': session.id }
      );
    } catch (error) {
      // List available worksheets and tables for debugging
      const worksheets = await callGraphAPI(
        `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets`,
        'GET',
        null,
        { 'workbook-session-id': session.id }
      );
      
      const worksheetNames = worksheets.value.map(ws => ws.name);
      
      // Close session before throwing error
      await callGraphAPI(
        `/drives/${drive.id}/items/${fileInfo.id}/workbook/closeSession`,
        'POST',
        null,
        { 'workbook-session-id': session.id }
      );
      
      throw new Error(`Worksheet or table not found. Available worksheets: ${worksheetNames.join(', ')}. Looking for worksheet: "${currentWorksheet}" and table: "${currentTable}"`);
    }
    
    // Get table columns
    const columns = await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${currentWorksheet}')/tables('${currentTable}')/columns`,
      'GET',
      null,
      { 'workbook-session-id': session.id }
    );
    
    const columnNames = columns.value.map(col => col.name);
    
    // Check if new sheet already exists
    let newSheet;
    try {
      newSheet = await callGraphAPI(
        `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${newSheetName}')`,
        'GET',
        null,
        { 'workbook-session-id': session.id }
      );
    } catch (error) {
      // Sheet doesn't exist, create it
      newSheet = await callGraphAPI(
        `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets/add`,
        'POST',
        { name: newSheetName },
        { 'workbook-session-id': session.id }
      );
    }
    
    // Create table with the same column structure
    const newTable = await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${newSheetName}')/tables/add`,
      'POST',
      {
        address: `A1:${String.fromCharCode(65 + columnNames.length - 1)}1`,
        hasHeaders: true
      },
      { 'workbook-session-id': session.id }
    );
    
    // Rename the table
    await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${newSheetName}')/tables('${newTable.name}')`,
      'PATCH',
      { name: newTableName },
      { 'workbook-session-id': session.id }
    );
    
    // Set column headers
    await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/worksheets('${newSheetName}')/tables('${newTableName}')/headerRowRange`,
      'PATCH',
      { values: [columnNames] },
      { 'workbook-session-id': session.id }
    );
    
    // Close session
    await callGraphAPI(
      `/drives/${drive.id}/items/${fileInfo.id}/workbook/closeSession`,
      'POST',
      null,
      { 'workbook-session-id': session.id }
    );
    
    res.status(200).json({
      success: true,
      message: 'Table structure copied successfully',
      details: {
        newSheetName,
        newTableName,
        columnsCopied: columnNames.length,
        columns: columnNames
      }
    });
    
  } catch (error) {
    console.error('Copy table structure failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to copy table structure',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Website Exit Survey API - SharePoint Integration',
    endpoints: {
      'POST /api/survey': 'Submit survey data',
      'GET /api/health': 'Health check',
      'GET /api/test-sharepoint': 'Test SharePoint connection',
      'POST /api/copy-table-structure': 'Copy table structure to new sheet (requires DEBUG_PASSWORD)'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`SharePoint Integration: ${process.env.SHAREPOINT_SITE_URL}`);
  console.log(`Excel File: ${process.env.EXCEL_FILE_PATH}`);
  console.log(`API health check: http://localhost:${PORT}/api/health`);
  console.log(`SharePoint test: http://localhost:${PORT}/api/test-sharepoint`);
});

module.exports = app;