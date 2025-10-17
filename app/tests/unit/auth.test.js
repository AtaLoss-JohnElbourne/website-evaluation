/**
 * Unit Tests for Debug Authentication
 * Tests the debug endpoint security middleware
 */

describe('Debug Authentication Middleware', () => {
  let debugAuth;
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    // Create mock Express req/res/next
    mockReq = {
      headers: {}
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    // Mock debugAuth middleware (we'll need to extract this to a testable module)
    debugAuth = (req, res, next) => {
      const isProduction = process.env.NODE_ENV === 'production';
      const enableDebugEndpoints = process.env.ENABLE_DEBUG_ENDPOINTS === 'true';
      
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
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.DEBUG_PASSWORD = 'test123';
    });

    test('should block access when debug endpoints disabled', () => {
      process.env.ENABLE_DEBUG_ENDPOINTS = 'false';
      
      debugAuth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Endpoint not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should require bearer token when debug endpoints enabled', () => {
      process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
      
      debugAuth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should allow access with correct bearer token', () => {
      process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
      mockReq.headers.authorization = 'Bearer test123';
      
      debugAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    test('should reject incorrect bearer token', () => {
      process.env.ENABLE_DEBUG_ENDPOINTS = 'true';
      mockReq.headers.authorization = 'Bearer wrong-password';
      
      debugAuth(mockReq, mockRes, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Development Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    test('should allow access without authentication in development', () => {
      process.env.ENABLE_DEBUG_ENDPOINTS = 'false';
      
      debugAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('Test Environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
    });

    test('should allow access without authentication in test', () => {
      process.env.ENABLE_DEBUG_ENDPOINTS = 'false';
      
      debugAuth(mockReq, mockRes, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});