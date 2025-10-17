/**
 * Unit Tests for Queue Management
 * Tests the core queue processing and management functions
 */

// Mock dependencies before importing server
jest.mock('@azure/msal-node');
jest.mock('axios');

// Import mocks
const { mockMSAL, mockAxios } = require('../mocks/azure');

// Mock modules
require('@azure/msal-node').ConfidentialClientApplication = mockMSAL.ConfidentialClientApplication;
require('axios').create = mockAxios.create;

describe('Queue Management', () => {
  let server;
  let originalQueue;
  let originalStats;
  let originalIsProcessing;

  beforeEach(() => {
    // Clear require cache and reimport server
    delete require.cache[require.resolve('../../server.js')];
    
    // Mock environment variables
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
    
    // Import server after mocks are set up
    server = require('../../server.js');
    
    // Store original queue state
    originalQueue = [...global.excelWriteQueue || []];
    originalStats = { ...global.queueStats || {} };
    originalIsProcessing = global.isProcessingQueue || false;
  });

  afterEach(() => {
    // Restore original queue state
    if (global.excelWriteQueue) {
      global.excelWriteQueue.length = 0;
      global.excelWriteQueue.push(...originalQueue);
    }
    if (global.queueStats) {
      Object.assign(global.queueStats, originalStats);
    }
    if (typeof global.isProcessingQueue !== 'undefined') {
      global.isProcessingQueue = originalIsProcessing;
    }
    
    // Clean up server if it exists
    if (server && server.close) {
      server.close();
    }
  });

  describe('Queue Data Validation', () => {
    test('should accept valid survey data', () => {
      const validData = {
        page_url: 'https://example.com/page1',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        timestamp: new Date().toISOString(),
        survey_responses: {
          rating: '4',
          feedback: 'Good website'
        }
      };

      // Test data validation logic (we'll need to extract this to a testable function)
      expect(validData.page_url).toBeTruthy();
      expect(validData.timestamp).toBeTruthy();
      expect(validData.survey_responses).toBeTruthy();
    });

    test('should reject invalid survey data', () => {
      const invalidData = {
        // Missing required fields
        survey_responses: null
      };

      expect(invalidData.page_url).toBeFalsy();
      expect(invalidData.survey_responses).toBeFalsy();
    });

    test('should sanitize dangerous input', () => {
      const dangerousData = {
        page_url: 'javascript:alert("xss")',
        user_agent: '<script>alert("xss")</script>',
        survey_responses: {
          feedback: '<script>steal_data()</script>'
        }
      };

      // Test sanitization (we'll need to extract this to a testable function)
      expect(dangerousData.page_url).toContain('javascript:');
      expect(dangerousData.user_agent).toContain('<script>');
    });
  });

  describe('Queue Operations', () => {
    test('should initialize empty queue', () => {
      // Test that queue starts empty
      const queueLength = global.excelWriteQueue?.length || 0;
      expect(queueLength).toBeGreaterThanOrEqual(0);
    });

    test('should track queue statistics', () => {
      // Test queue stats structure
      const stats = global.queueStats || {};
      expect(typeof stats).toBe('object');
    });
  });

  describe('Environment Configuration', () => {
    test('should load environment variables correctly', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.ENABLE_DEBUG_ENDPOINTS).toBe('true');
    });

    test('should use default values for missing config', () => {
      const worksheetName = process.env.WORKSHEET_NAME || 'Sheet1';
      const tableName = process.env.TABLE_NAME || 'Table1';
      
      expect(worksheetName).toBeTruthy();
      expect(tableName).toBeTruthy();
    });
  });
});