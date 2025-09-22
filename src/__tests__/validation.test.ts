import { ValidationService } from '../validation';
import { ErrorCodes } from '../types';

describe('ValidationService', () => {
  describe('validateRequest', () => {
    test('should reject when neither days nor hours are provided', () => {
      const result = ValidationService.validateRequest({});
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.INVALID_PARAMETERS);
      expect(result.error?.message).toContain('At least one parameter');
    });

    test('should accept valid days parameter', () => {
      const result = ValidationService.validateRequest({ days: '5' });
      
      expect(result.isValid).toBe(true);
      expect(result.parsedRequest?.days).toBe(5);
    });

    test('should accept valid hours parameter', () => {
      const result = ValidationService.validateRequest({ hours: '8' });
      
      expect(result.isValid).toBe(true);
      expect(result.parsedRequest?.hours).toBe(8);
    });

    test('should accept both days and hours parameters', () => {
      const result = ValidationService.validateRequest({ days: '2', hours: '4' });
      
      expect(result.isValid).toBe(true);
      expect(result.parsedRequest?.days).toBe(2);
      expect(result.parsedRequest?.hours).toBe(4);
    });

    test('should reject negative days', () => {
      const result = ValidationService.validateRequest({ days: '-1' });
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.NEGATIVE_VALUES);
    });

    test('should reject negative hours', () => {
      const result = ValidationService.validateRequest({ hours: '-5' });
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.NEGATIVE_VALUES);
    });

    test('should reject invalid days format', () => {
      const result = ValidationService.validateRequest({ days: 'abc' });
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.INVALID_PARAMETERS);
    });

    test('should reject invalid hours format', () => {
      const result = ValidationService.validateRequest({ hours: 'xyz' });
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.INVALID_PARAMETERS);
    });

    test('should accept valid ISO 8601 date with Z suffix', () => {
      const result = ValidationService.validateRequest({ 
        days: '1',
        date: '2025-08-01T14:00:00Z' 
      });
      
      expect(result.isValid).toBe(true);
      expect(result.parsedRequest?.startDate).toBeInstanceOf(Date);
    });

    test('should accept valid ISO 8601 date with milliseconds and Z suffix', () => {
      const result = ValidationService.validateRequest({ 
        hours: '2',
        date: '2025-08-01T14:00:00.000Z' 
      });
      
      expect(result.isValid).toBe(true);
      expect(result.parsedRequest?.startDate).toBeInstanceOf(Date);
    });

    test('should reject date without Z suffix', () => {
      const result = ValidationService.validateRequest({ 
        days: '1',
        date: '2025-08-01T14:00:00' 
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.INVALID_DATE_FORMAT);
    });

    test('should reject invalid date format', () => {
      const result = ValidationService.validateRequest({ 
        days: '1',
        date: '2025-13-45T25:70:90Z' 
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.INVALID_DATE_FORMAT);
    });

    test('should reject non-ISO 8601 date format', () => {
      const result = ValidationService.validateRequest({ 
        days: '1',
        date: '08/01/2025' 
      });
      
      expect(result.isValid).toBe(false);
      expect(result.error?.error).toBe(ErrorCodes.INVALID_DATE_FORMAT);
    });
  });

  describe('createInternalError', () => {
    test('should create internal error response', () => {
      const error = ValidationService.createInternalError('Test error message');
      
      expect(error.error).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(error.message).toBe('Test error message');
    });
  });
});
