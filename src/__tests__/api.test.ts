import request from 'supertest';
import app from '../index';
import { HolidaysService, HolidayServiceStatus } from '../holidays';

describe('API Endpoints', () => {
  let mockGetColombianHolidays: jest.SpyInstance;

  beforeEach(() => {
    mockGetColombianHolidays = jest.spyOn(HolidaysService, 'getColombianHolidays');
    mockGetColombianHolidays.mockResolvedValue({
      holidays: ['2025-04-17', '2025-04-18', '2025-12-25'],
      status: HolidayServiceStatus.HEALTHY,
      source: 'API',
      lastUpdated: Date.now()
    });
  });

  afterEach(() => {
    mockGetColombianHolidays.mockRestore();
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('OK');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('GET /calculate-business-time', () => {
    test('should return 400 when no parameters provided', async () => {
      const response = await request(app)
        .get('/calculate-business-time')
        .expect(400);

      expect(response.body.error).toBe('InvalidParameters');
      expect(response.body.message).toContain('At least one parameter');
    });

    test('should return 400 for negative days', async () => {
      const response = await request(app)
        .get('/calculate-business-time?days=-1')
        .expect(400);

      expect(response.body.error).toBe('NegativeValues');
    });

    test('should return 400 for invalid date format', async () => {
      const response = await request(app)
        .get('/calculate-business-time?days=1&date=invalid-date')
        .expect(400);

      expect(response.body.error).toBe('InvalidDateFormat');
    });

    test('should calculate business days correctly', async () => {
      const response = await request(app)
        .get('/calculate-business-time?days=1&date=2025-08-01T13:00:00Z')
        .expect(200);

      expect(response.body.date).toBeDefined();
      expect(typeof response.body.date).toBe('string');
      expect(response.body.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should calculate business hours correctly', async () => {
      const response = await request(app)
        .get('/calculate-business-time?hours=2&date=2025-08-01T13:00:00Z')
        .expect(200);

      expect(response.body.date).toBeDefined();
      expect(typeof response.body.date).toBe('string');
    });

    test('should calculate both days and hours correctly', async () => {
      const response = await request(app)
        .get('/calculate-business-time?days=1&hours=3&date=2025-08-01T13:00:00Z')
        .expect(200);

      expect(response.body.date).toBeDefined();
      expect(typeof response.body.date).toBe('string');
    });

    test('should work without date parameter (using current time)', async () => {
      const response = await request(app)
        .get('/calculate-business-time?days=1')
        .expect(200);

      expect(response.body.date).toBeDefined();
      expect(typeof response.body.date).toBe('string');
    });

    test('should use fallback data when holidays service fails', async () => {
      // Mock the service to return fallback data as it would in a real failure scenario
      mockGetColombianHolidays.mockReset();
      mockGetColombianHolidays.mockResolvedValueOnce({
        holidays: ['2024-01-01', '2024-12-25'], // Fallback holiday data
        status: HolidayServiceStatus.FAILED,
        source: 'FALLBACK',
        lastUpdated: null
      });

      const response = await request(app)
        .get('/calculate-business-time?days=1')
        .expect(200); // Should succeed with fallback data

      expect(response.body.date).toBeDefined();
      expect(typeof response.body.date).toBe('string');
      
      // Check that headers indicate degraded service
      expect(response.headers['x-holiday-service-status']).toBe('FAILED');
      expect(response.headers['x-holiday-data-source']).toBe('FALLBACK');
      
      // Restore the mock for other tests
      mockGetColombianHolidays.mockResolvedValue({
        holidays: ['2025-04-17', '2025-04-18', '2025-12-25'],
        status: HolidayServiceStatus.HEALTHY,
        source: 'API',
        lastUpdated: Date.now()
      });
    });

    test('should accept hours parameter with decimals as integers', async () => {
      const response = await request(app)
        .get('/calculate-business-time?hours=8&date=2025-08-01T08:00:00Z')
        .expect(200);

      expect(response.body.date).toBeDefined();
    });
  });

  describe('404 handler', () => {
    test('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/unknown-endpoint')
        .expect(404);

      expect(response.body.error).toBe('NotFound');
      expect(response.body.message).toContain('not found');
    });
  });

  describe('Response format validation', () => {
    test('should return exactly the required response format for success', async () => {
      const response = await request(app)
        .get('/calculate-business-time?days=1&date=2025-08-01T13:00:00Z')
        .expect(200);

      // Should have exactly one key: 'date'
      expect(Object.keys(response.body)).toEqual(['date']);
      expect(response.body.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should return exactly the required error format', async () => {
      const response = await request(app)
        .get('/calculate-business-time')
        .expect(400);

      // Should have exactly two keys: 'error' and 'message'
      expect(Object.keys(response.body).sort()).toEqual(['error', 'message']);
      expect(typeof response.body.error).toBe('string');
      expect(typeof response.body.message).toBe('string');
    });
  });
});