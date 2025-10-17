/**
 * Jest Test Setup
 * Global test configuration and environment setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
process.env.AZURE_TENANT_ID = 'test-tenant-id';
process.env.SHAREPOINT_SITE_URL = 'https://test.sharepoint.com/sites/test';
process.env.EXCEL_FILE_PATH = '/test/file.xlsx';
process.env.WORKSHEET_NAME = 'TestSheet';
process.env.TABLE_NAME = 'TestTable';
process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
process.env.DEBUG_PASSWORD = 'test123';

// Global test timeout
jest.setTimeout(10000);

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Clear all mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});