/**
 * Mock implementations for Azure/SharePoint services
 */

// Mock MSAL (Azure authentication)
const mockMSAL = {
  ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenByClientCredential: jest.fn().mockResolvedValue({
      accessToken: 'mock-access-token',
      expiresOn: new Date(Date.now() + 3600000) // 1 hour from now
    })
  }))
};

// Mock Microsoft Graph API responses
const mockGraphResponses = {
  site: {
    id: 'test-site-id',
    name: 'Test Site',
    webUrl: 'https://test.sharepoint.com/sites/test'
  },
  drive: {
    id: 'test-drive-id',
    name: 'Documents'
  },
  file: {
    id: 'test-file-id',
    name: 'test-file.xlsx',
    webUrl: 'https://test.sharepoint.com/test-file.xlsx'
  },
  workbook: {
    '@odata.context': 'https://graph.microsoft.com/v1.0/$metadata#drives/test/workbook',
    '@odata.id': '/drives/test/workbook'
  },
  session: {
    id: 'test-session-id'
  },
  tables: {
    value: [
      {
        id: '{TEST-TABLE-ID}',
        name: 'TestTable',
        address: 'A1:Z100'
      }
    ]
  },
  tableRows: {
    value: []
  }
};

// Mock axios for HTTP requests
const mockAxios = {
  create: jest.fn(() => mockAxios),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: {
    headers: {
      common: {}
    }
  }
};

module.exports = {
  mockMSAL,
  mockGraphResponses,
  mockAxios
};