/**
 * Enhanced Excel Integration Testing
 * Simulates real Excel operations without requiring actual SharePoint
 */

// Enhanced mock that simulates real Excel behavior
const mockExcelOperations = {
  // Mock table structure matching your actual Excel table
  testTable: {
    id: '{TEST-TABLE-ID}',
    name: 'AAL_Table',
    columns: [
      { name: 'Timestamp', type: 'string' },
      { name: 'PageURL', type: 'string' },
      { name: 'UserAgent', type: 'string' },
      { name: 'Rating', type: 'string' },
      { name: 'Feedback', type: 'string' }
    ],
    rows: []
  },

  // Simulate adding a row with validation
  addRow: function(data) {
    try {
      // Validate required fields
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data object');
      }

      // Sanitize and validate data
      const sanitizedData = this._sanitizeData(data);
      
      const row = {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        values: [
          sanitizedData.timestamp || new Date().toISOString(),
          sanitizedData.page_url || '',
          sanitizedData.user_agent || '',
          sanitizedData.survey_responses?.rating || '',
          sanitizedData.survey_responses?.feedback || ''
        ],
        createdAt: new Date().toISOString()
      };
      
      this.testTable.rows.push(row);
      return { 
        success: true, 
        row,
        rowCount: this.testTable.rows.length
      };
    } catch (error) {
      return { 
        success: false, 
        error: error.message,
        data 
      };
    }
  },

  // Data sanitization (simulates real Excel processing)
  _sanitizeData: function(data) {
    const sanitized = { ...data };
    
    // URL validation and sanitization
    if (sanitized.page_url) {
      // Remove potential XSS
      sanitized.page_url = sanitized.page_url.toString().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      // Truncate if too long (Excel has cell limits)
      if (sanitized.page_url.length > 2000) {
        sanitized.page_url = sanitized.page_url.substring(0, 1997) + '...';
      }
    }

    // User agent sanitization
    if (sanitized.user_agent) {
      sanitized.user_agent = sanitized.user_agent.toString().replace(/[<>]/g, '');
      if (sanitized.user_agent.length > 500) {
        sanitized.user_agent = sanitized.user_agent.substring(0, 497) + '...';
      }
    }

    // Survey responses sanitization
    if (sanitized.survey_responses) {
      if (sanitized.survey_responses.rating) {
        // Ensure rating is a valid number string
        const rating = sanitized.survey_responses.rating.toString();
        if (!/^[1-5]$/.test(rating)) {
          sanitized.survey_responses.rating = '3'; // Default to neutral
        }
      }

      if (sanitized.survey_responses.feedback) {
        // Sanitize feedback text
        let feedback = sanitized.survey_responses.feedback.toString();
        feedback = feedback.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        // Excel cell limit simulation
        if (feedback.length > 32767) {
          feedback = feedback.substring(0, 32764) + '...';
        }
        sanitized.survey_responses.feedback = feedback;
      }
    }

    // Timestamp validation
    if (sanitized.timestamp) {
      try {
        new Date(sanitized.timestamp).toISOString();
      } catch (e) {
        sanitized.timestamp = new Date().toISOString();
      }
    }

    return sanitized;
  },

  // Simulate getting table data
  getTable: function() {
    return {
      success: true,
      table: this.testTable,
      rowCount: this.testTable.rows.length,
      lastUpdated: new Date().toISOString()
    };
  },

  // Simulate connection test
  testConnection: function() {
    return {
      success: true,
      message: 'Mock Excel connection successful',
      timestamp: new Date().toISOString(),
      tableInfo: {
        name: this.testTable.name,
        columns: this.testTable.columns.length,
        rows: this.testTable.rows.length
      }
    };
  },

  // Simulate getting table statistics
  getStats: function() {
    const rows = this.testTable.rows;
    const stats = {
      totalRows: rows.length,
      ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      averageRating: 0,
      feedbackCount: 0,
      dateRange: { earliest: null, latest: null }
    };

    if (rows.length > 0) {
      let totalRating = 0;
      let ratingCount = 0;

      rows.forEach(row => {
        // Rating distribution
        const rating = row.values[3];
        if (rating && stats.ratingDistribution[rating] !== undefined) {
          stats.ratingDistribution[rating]++;
          totalRating += parseInt(rating);
          ratingCount++;
        }

        // Feedback count
        if (row.values[4] && row.values[4].trim()) {
          stats.feedbackCount++;
        }

        // Date range
        const timestamp = row.values[0];
        if (timestamp) {
          const date = new Date(timestamp);
          if (!stats.dateRange.earliest || date < new Date(stats.dateRange.earliest)) {
            stats.dateRange.earliest = timestamp;
          }
          if (!stats.dateRange.latest || date > new Date(stats.dateRange.latest)) {
            stats.dateRange.latest = timestamp;
          }
        }
      });

      stats.averageRating = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;
    }

    return stats;
  },

  // Simulate batch operations
  addBatch: function(dataArray) {
    const results = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    };

    dataArray.forEach((data, index) => {
      const result = this.addRow(data);
      if (result.success) {
        results.processed++;
      } else {
        results.failed++;
        results.errors.push({ index, error: result.error });
      }
    });

    results.success = results.failed === 0;
    return results;
  },

  // Reset for clean tests
  reset: function() {
    this.testTable.rows = [];
  },

  // Simulate Excel errors
  simulateError: function(errorType = 'connection') {
    const errors = {
      connection: { success: false, error: 'Connection to Excel failed' },
      permission: { success: false, error: 'Insufficient permissions to write to Excel' },
      quota: { success: false, error: 'Excel file quota exceeded' },
      format: { success: false, error: 'Invalid data format for Excel' }
    };

    return errors[errorType] || errors.connection;
  }
};

module.exports = { mockExcelOperations };