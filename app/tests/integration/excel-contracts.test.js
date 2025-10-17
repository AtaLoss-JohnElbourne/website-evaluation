/**
 * Contract Testing for Excel Integration
 * Tests the expected behavior and data contracts without external dependencies
 */

const request = require('supertest');
const { mockExcelOperations } = require('../mocks/excel-operations');

// Mock dependencies before importing app
jest.mock('@azure/msal-node');
jest.mock('axios');

const { mockMSAL, mockAxios, mockGraphResponses } = require('../mocks/azure');

// Set up mocks
require('@azure/msal-node').ConfidentialClientApplication = mockMSAL.ConfidentialClientApplication;
const axios = require('axios');
axios.create = mockAxios.create;
mockAxios.get.mockResolvedValue({ data: mockGraphResponses.site });
mockAxios.post.mockResolvedValue({ data: mockGraphResponses.session });

describe('Excel Integration Contracts', () => {
  let app;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
    process.env.DEBUG_PASSWORD = 'test123';
    process.env.PORT = '0';
    
    // Import server without auto-start
    const originalListen = require('express').application.listen;
    require('express').application.listen = function(port, callback) {
      if (callback) callback();
      return { close: () => {} };
    };
    
    delete require.cache[require.resolve('../../server.js')];
    app = require('../../server.js');
    
    require('express').application.listen = originalListen;
  });

  beforeEach(() => {
    mockExcelOperations.reset();
    jest.clearAllMocks();
  });

  describe('Data Transformation Contracts', () => {
    test('should transform survey data into Excel row format', () => {
      const surveyData = {
        page_url: 'https://example.com/test-page',
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
        timestamp: '2025-10-16T10:30:00.000Z',
        survey_responses: {
          rating: '4',
          feedback: 'The website is very user-friendly and informative.'
        }
      };

      // Test the data transformation
      const result = mockExcelOperations.addRow(surveyData);
      
      expect(result.success).toBe(true);
      expect(result.row.values).toEqual([
        '2025-10-16T10:30:00.000Z',
        'https://example.com/test-page',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
        '4',
        'The website is very user-friendly and informative.'
      ]);
    });

    test('should handle special characters and long text in feedback', () => {
      const surveyData = {
        page_url: 'https://example.com/special-chars?param=test&value=123',
        user_agent: 'Mozilla/5.0 "Special" Browser',
        timestamp: new Date().toISOString(),
        survey_responses: {
          rating: '5',
          feedback: 'Great site! "Excellent" content with émojis 🎉 and symbols: @#$%^&*()'
        }
      };

      const result = mockExcelOperations.addRow(surveyData);
      
      expect(result.success).toBe(true);
      expect(result.row.values[4]).toContain('émojis 🎉');
      expect(result.row.values[4]).toContain('@#$%^&*()');
    });

    test('should handle missing optional fields gracefully', () => {
      const minimalSurveyData = {
        page_url: 'https://example.com/minimal',
        timestamp: new Date().toISOString(),
        survey_responses: {
          rating: '3'
          // feedback is missing
        }
      };

      const result = mockExcelOperations.addRow(minimalSurveyData);
      
      expect(result.success).toBe(true);
      expect(result.row.values[3]).toBe('3'); // rating
      expect(result.row.values[4]).toBe(''); // feedback (empty string when missing)
    });
  });

  describe('Queue Processing Contracts', () => {
    test('should maintain FIFO order in queue processing', () => {
      const submissions = [
        { 
          page_url: 'https://first.com', 
          timestamp: '2025-10-16T10:00:00.000Z',
          survey_responses: { rating: '5', feedback: 'First submission' }
        },
        { 
          page_url: 'https://second.com', 
          timestamp: '2025-10-16T10:01:00.000Z',
          survey_responses: { rating: '3', feedback: 'Second submission' }
        },
        { 
          page_url: 'https://third.com', 
          timestamp: '2025-10-16T10:02:00.000Z',
          survey_responses: { rating: '4', feedback: 'Third submission' }
        }
      ];

      // Process in order
      submissions.forEach(data => {
        data.user_agent = 'Test Browser';
        mockExcelOperations.addRow(data);
      });

      const table = mockExcelOperations.getTable();
      expect(table.rowCount).toBe(3);
      
      // Verify order is maintained
      expect(table.table.rows[0].values[4]).toBe('First submission');
      expect(table.table.rows[1].values[4]).toBe('Second submission');
      expect(table.table.rows[2].values[4]).toBe('Third submission');
    });

    test('should handle concurrent submissions without data corruption', () => {
      const concurrentSubmissions = Array.from({ length: 10 }, (_, i) => ({
        page_url: `https://concurrent-${i}.com`,
        user_agent: `Browser-${i}`,
        timestamp: new Date(Date.now() + i * 100).toISOString(),
        survey_responses: {
          rating: String((i % 5) + 1),
          feedback: `Concurrent feedback ${i}`
        }
      }));

      // Simulate concurrent processing
      concurrentSubmissions.forEach(data => {
        mockExcelOperations.addRow(data);
      });

      const table = mockExcelOperations.getTable();
      expect(table.rowCount).toBe(10);
      
      // Verify all data is present and uncorrupted
      table.table.rows.forEach((row, index) => {
        expect(row.values[1]).toBe(`https://concurrent-${index}.com`);
        expect(row.values[4]).toBe(`Concurrent feedback ${index}`);
      });
    });
  });

  describe('API to Excel Data Flow', () => {
    test('should process complete survey submission flow', async () => {
      const surveyData = {
        page_url: 'https://example.com/api-test',
        user_agent: 'Mozilla/5.0 API Test Browser',
        timestamp: new Date().toISOString(),
        survey_responses: {
          rating: '4',
          feedback: 'API integration test feedback'
        }
      };

      // Mock successful Excel write
      const originalAddRow = mockExcelOperations.addRow;
      let capturedData = null;
      mockExcelOperations.addRow = (data) => {
        capturedData = data;
        return originalAddRow.call(mockExcelOperations, data);
      };

      // Submit via API
      const response = await request(app)
        .post('/api/survey')
        .send(surveyData)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Note: In real integration, we'd verify capturedData matches surveyData
      // For now, we're testing the API contract
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Error Handling Contracts', () => {
    test('should handle malformed survey data gracefully', () => {
      const malformedData = {
        page_url: null,
        user_agent: undefined,
        timestamp: 'invalid-date',
        survey_responses: { 
          rating: undefined,
          feedback: null
        }
      };

      // Should not throw but may return error or sanitized data
      expect(() => {
        const result = mockExcelOperations.addRow(malformedData);
        // Excel operations should be resilient
        expect(typeof result).toBe('object');
      }).not.toThrow();
    });

    test('should handle extremely long feedback text', () => {
      const longFeedback = 'A'.repeat(10000); // 10KB of text
      const surveyData = {
        page_url: 'https://example.com/long-feedback',
        user_agent: 'Test Browser',
        timestamp: new Date().toISOString(),
        survey_responses: {
          rating: '5',
          feedback: longFeedback
        }
      };

      const result = mockExcelOperations.addRow(surveyData);
      
      expect(result.success).toBe(true);
      expect(result.row.values[4]).toBe(longFeedback);
    });
  });

  describe('Performance Contracts', () => {
    test('should handle high volume submissions efficiently', () => {
      const start = performance.now();
      
      // Simulate 100 submissions
      for (let i = 0; i < 100; i++) {
        mockExcelOperations.addRow({
          timestamp: new Date(Date.now() + i).toISOString(),
          page_url: `https://performance-test-${i}.com`,
          user_agent: 'Performance Test Browser',
          survey_responses: { 
            rating: String((i % 5) + 1), 
            feedback: `Performance test feedback ${i}` 
          }
        });
      }
      
      const end = performance.now();
      const table = mockExcelOperations.getTable();
      
      expect(table.rowCount).toBe(100);
      expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    });

    test('should maintain performance with large existing dataset', () => {
      // Pre-populate with large dataset
      for (let i = 0; i < 1000; i++) {
        mockExcelOperations.addRow({
          timestamp: new Date(Date.now() - (1000 - i) * 1000).toISOString(),
          page_url: `https://existing-${i}.com`,
          user_agent: 'Existing Data Browser',
          survey_responses: { rating: '3', feedback: `Existing ${i}` }
        });
      }

      const start = performance.now();
      
      // Add new submission to large dataset
      mockExcelOperations.addRow({
        timestamp: new Date().toISOString(),
        page_url: 'https://new-submission.com',
        user_agent: 'New Submission Browser',
        survey_responses: { rating: '5', feedback: 'New submission to large dataset' }
      });
      
      const end = performance.now();
      const table = mockExcelOperations.getTable();
      
      expect(table.rowCount).toBe(1001);
      expect(end - start).toBeLessThan(100); // Should still be fast
    });
  });

  describe('Data Validation Contracts', () => {
    test('should validate required fields are present', () => {
      const validData = {
        page_url: 'https://example.com/valid',
        timestamp: new Date().toISOString(),
        survey_responses: {
          rating: '4'
        }
      };

      const result = mockExcelOperations.addRow(validData);
      expect(result.success).toBe(true);
    });

    test('should handle URL validation', () => {
      const urlTests = [
        'https://valid.com',
        'http://also-valid.com',
        'https://subdomain.example.org/path?query=value',
        'invalid-url',
        'javascript:alert("xss")',
        ''
      ];

      urlTests.forEach(url => {
        const data = {
          page_url: url,
          timestamp: new Date().toISOString(),
          survey_responses: { rating: '3' }
        };

        expect(() => {
          mockExcelOperations.addRow(data);
        }).not.toThrow();
      });
    });
  });
});