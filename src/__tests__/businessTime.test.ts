import { BusinessTimeCalculator } from '../businessTime';
import { HolidaysService, HolidayServiceStatus } from '../holidays';

import { format } from 'date-fns-tz';

describe('BusinessTimeCalculator', () => {
  const mockHolidays = ['2025-04-17', '2025-04-18', '2025-12-25'];

  beforeAll(() => {
    // Mock the holidays service
    jest.spyOn(HolidaysService, 'getColombianHolidays').mockResolvedValue({
      holidays: mockHolidays,
      status: HolidayServiceStatus.HEALTHY,
      source: 'API',
      lastUpdated: Date.now()
    });
  });

  describe('timezone conversion', () => {
    test('should convert UTC to Colombia time correctly', () => {
      const utcDate = new Date('2025-08-01T19:00:00.000Z'); // 7 PM UTC
      const colombiaTime = BusinessTimeCalculator.utcToColombiaTime(utcDate);
      
      // Colombia is UTC-5, so 7 PM UTC = 2 PM Colombia time
      expect(colombiaTime.getHours()).toBe(14);
    });

    test('should convert Colombia time to UTC correctly', () => {
      // Create a date object representing 2 PM in Colombia
      const colombiaDate = new Date('2025-08-01T14:00:00');
      const utcTime = BusinessTimeCalculator.colombiaTimeToUtc(colombiaDate);
      
      // 2 PM Colombia time = 7 PM UTC
      expect(utcTime.getUTCHours()).toBe(19);
    });
  });

  describe('business day validation', () => {
    test('should identify weekdays as business days (excluding holidays)', () => {
      const monday = new Date('2025-08-04T12:00:00Z'); // Monday
      expect(BusinessTimeCalculator.isBusinessDay(monday, mockHolidays)).toBe(true);
      
      const friday = new Date('2025-08-08T12:00:00Z'); // Friday
      expect(BusinessTimeCalculator.isBusinessDay(friday, mockHolidays)).toBe(true);
    });

    test('should identify weekends as non-business days', () => {
      const saturday = new Date('2025-08-02T12:00:00Z'); // Saturday
      expect(BusinessTimeCalculator.isBusinessDay(saturday, mockHolidays)).toBe(false);
      
      const sunday = new Date('2025-08-03T12:00:00Z'); // Sunday
      expect(BusinessTimeCalculator.isBusinessDay(sunday, mockHolidays)).toBe(false);
    });

    test('should identify holidays as non-business days', () => {
      const holiday = new Date('2025-12-25T12:00:00Z'); // Christmas
      expect(BusinessTimeCalculator.isBusinessDay(holiday, mockHolidays)).toBe(false);
    });
  });

  describe('working hours validation', () => {
    test('should identify working hours correctly', () => {
      const workStart = new Date('2025-08-01T08:00:00'); // 8 AM
      expect(BusinessTimeCalculator.isWithinWorkingHours(workStart)).toBe(true);
      
      const beforeLunch = new Date('2025-08-01T11:30:00'); // 11:30 AM
      expect(BusinessTimeCalculator.isWithinWorkingHours(beforeLunch)).toBe(true);
      
      const afterLunch = new Date('2025-08-01T13:30:00'); // 1:30 PM
      expect(BusinessTimeCalculator.isWithinWorkingHours(afterLunch)).toBe(true);
      
      const workEnd = new Date('2025-08-01T16:59:00'); // 4:59 PM
      expect(BusinessTimeCalculator.isWithinWorkingHours(workEnd)).toBe(true);
    });

    test('should identify non-working hours correctly', () => {
      const beforeWork = new Date('2025-08-01T07:30:00'); // 7:30 AM
      expect(BusinessTimeCalculator.isWithinWorkingHours(beforeWork)).toBe(false);
      
      const lunch = new Date('2025-08-01T12:30:00'); // 12:30 PM (lunch)
      expect(BusinessTimeCalculator.isWithinWorkingHours(lunch)).toBe(false);
      
      const afterWork = new Date('2025-08-01T17:00:00'); // 5:00 PM
      expect(BusinessTimeCalculator.isWithinWorkingHours(afterWork)).toBe(false);
    });
  });

  describe('business time adjustment', () => {
    test('should adjust weekend to previous Friday 5 PM', () => {
      // Create Saturday 2 PM in UTC, then convert to Colombia time
      const utcSaturday = new Date('2025-09-20T19:00:00.000Z'); // This will be 2 PM Colombia time  
      const colombiaSaturday = BusinessTimeCalculator.utcToColombiaTime(utcSaturday);
      const adjustment = BusinessTimeCalculator.adjustToPrevBusinessTime(colombiaSaturday, mockHolidays);
      
      expect(adjustment.wasAdjusted).toBe(true);
      expect(adjustment.date.getDay()).toBe(5); // Friday
      expect(adjustment.date.getHours()).toBe(17); // 5 PM Colombia time
    });

    test('should adjust before-hours to 5 PM previous day', () => {
      // Create Monday 6 AM in UTC, then convert to Colombia time
      const utcEarlyMorning = new Date('2025-09-15T11:00:00.000Z'); // This will be 6 AM Colombia time
      const colombiaEarlyMorning = BusinessTimeCalculator.utcToColombiaTime(utcEarlyMorning);
      const adjustment = BusinessTimeCalculator.adjustToPrevBusinessTime(colombiaEarlyMorning, mockHolidays);
      
      expect(adjustment.wasAdjusted).toBe(true);
      expect(adjustment.date.getHours()).toBe(17); // 5 PM Colombia time
      expect(adjustment.date.getDate()).toBe(12); // Previous friday
    });

    test('should adjust after-hours to 5 PM same day', () => {
      // Create Monday 6 PM in UTC, then convert to Colombia time
      const utcEarlyMorning = new Date('2025-09-15T23:00:00.000Z'); // This will be 6 PM Colombia time
      const colombiaEarlyMorning = BusinessTimeCalculator.utcToColombiaTime(utcEarlyMorning);
      const adjustment = BusinessTimeCalculator.adjustToPrevBusinessTime(colombiaEarlyMorning, mockHolidays);
      
      expect(adjustment.wasAdjusted).toBe(true);
      expect(adjustment.date.getHours()).toBe(17); // 5 PM Colombia time
      expect(adjustment.date.getDate()).toBe(15); // Same day
    });

    test('should adjust lunch time to 12 PM', () => {
      // Create Monday 12:30 PM in UTC, then convert to Colombia time
      const utcLunchTime = new Date('2025-08-04T17:30:00.000Z'); // This will be 12:30 PM Colombia time
      const colombiaLunchTime = BusinessTimeCalculator.utcToColombiaTime(utcLunchTime);
      const adjustment = BusinessTimeCalculator.adjustToPrevBusinessTime(colombiaLunchTime, mockHolidays);
      
      expect(adjustment.wasAdjusted).toBe(true);
      expect(adjustment.date.getHours()).toBe(12); // 12 PM Colombia time
    });
  });

  describe('business days calculation', () => {
    test('should add business days correctly', () => {
      const friday = BusinessTimeCalculator.utcToColombiaTime(new Date('2025-08-01T15:00:00.000Z')); // Friday 10 AM Colombia time
      const result = BusinessTimeCalculator.addBusinessDays(friday, 1, mockHolidays);
      
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getDate()).toBe(4); // Next Monday
    });

    test('should skip weekends and holidays', () => {
      const thursday = BusinessTimeCalculator.utcToColombiaTime(new Date('2025-04-17T15:00:00.000Z')); // Holiday Thursday 10 AM Colombia time
      const result = BusinessTimeCalculator.addBusinessDays(thursday, 1, mockHolidays);
      
      // Should skip Friday holiday (4/18) and weekend, land on Monday 4/21
      expect(result.getDate()).toBe(21);
    });
  });

  describe('business hours calculation', () => {
    test('should add business hours within same day', () => {
      const morning = BusinessTimeCalculator.utcToColombiaTime(new Date('2025-08-04T14:00:00.000Z')); // Monday 9 AM Colombia time
      const result = BusinessTimeCalculator.addBusinessHours(morning, 2, mockHolidays);
      
      expect(result.getHours()).toBe(11); // 11 AM Colombia time
      expect(result.getDate()).toBe(4); // Same day
    });

    test('should handle lunch break correctly', () => {
      const beforeLunch = BusinessTimeCalculator.utcToColombiaTime(new Date('2025-08-04T16:30:00.000Z')); // Monday 11:30 AM Colombia time
      const result = BusinessTimeCalculator.addBusinessHours(beforeLunch, 1, mockHolidays);
      
      expect(result.getHours()).toBe(13); // 1:30 PM (skipped lunch)
      expect(result.getMinutes()).toBe(30);
    });

    test('should carry over to next business day', () => {
      const lateAfternoon = BusinessTimeCalculator.utcToColombiaTime(new Date('2025-08-01T21:00:00.000Z')); // Friday 4 PM Colombia time
      const result = BusinessTimeCalculator.addBusinessHours(lateAfternoon, 2, mockHolidays);
      
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(9); // 9 AM (1 hour carried over)
    });
  });

  describe('example scenarios from requirements', () => {
    test('Example 1: Friday 5 PM + 1 hour → Monday 9 AM', () => {
      const friday5pm = new Date('2025-08-01T17:00:00'); // Friday 5 PM (Colombia time)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(friday5pm);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, undefined, 1, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDay()).toBe(1); // Monday
      expect(resultColombia.getHours()).toBe(9); // 9 AM
    });

    test('Example 2: Saturday 2 PM + 1 hour → Monday 9 AM', () => {
      const saturday2pm = new Date('2025-08-02T19:00:00.000Z'); // Saturday 2 PM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(saturday2pm);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, undefined, 1, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDay()).toBe(1); // Monday
      expect(resultColombia.getHours()).toBe(9); // 9 AM Colombia time
    });

    test('Example 3: Tuesday 3 PM + 1 day + 4 hours → Thursday 10 AM', () => {
      const tuesday3pm = new Date('2025-09-16T20:00:00.000Z'); // Tuesday 3 PM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(tuesday3pm);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, 1, 4, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDay()).toBe(4); // Thursday
      expect(resultColombia.getHours()).toBe(10); // 10 AM Colombia time
    });

    test('Example 4: Sunday 6 PM + 1 day → Monday 5 PM', () => {
      const sunday6pm = new Date('2025-09-14T23:00:00.000Z'); // Sunday 6 PM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(sunday6pm);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, 1, undefined, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDay()).toBe(1); // Monday
      expect(resultColombia.getHours()).toBe(17); // 5 PM Colombia time
    });

    test('Example 5: Business day 8 AM + 8 hours → same day 5 PM', () => {
      const monday8am = new Date('2025-09-01T13:00:00.000Z'); // Monday 8 AM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(monday8am);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, undefined, 8, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDate()).toBe(1); // Same day (Monday)
      expect(resultColombia.getHours()).toBe(17); // 5 PM
    });

    test('Example 6: Business day 8 AM + 1 day → next business day 8 AM', () => {
      const monday8am = new Date('2025-09-01T13:00:00.000Z'); // Monday 8 AM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(monday8am);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, 1, undefined, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDate()).toBe(2); // Next day (Tuesday)
      expect(resultColombia.getHours()).toBe(8); // 8 AM
    });

    test('Example 7: Business day 12:30 PM + 1 day → next business day 12 PM', () => {
      const mondayHalfPast12pm = new Date('2025-09-01T17:30:00.000Z'); // Monday 12:30 PM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(mondayHalfPast12pm);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, 1, undefined, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDate()).toBe(2); // Next business day (Tuesday)
      expect(resultColombia.getHours()).toBe(12); // 12 PM
    });

    test('Example 8: Business day 11:30 AM + 3 hours → same business day 3:30 PM', () => {
      const mondayHalfPast11am = new Date('2025-09-01T16:30:00.000Z'); // Monday 11:30 AM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(mondayHalfPast11am);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, undefined, 3, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDate()).toBe(1); // Same day Monday
      expect(resultColombia.getHours()).toBe(15); // 3 PM
      expect(resultColombia.getMinutes()).toBe(30); // 3:30 PM
    });

    test('Example 9: Start Date (2025-04-10T15:00:00.000Z) + 5 days + 4 hours (April 17 and 18 are holidays) → April 21st at 3:30pm (Colombian time)', () => {
      const mondayHalfPast11am = new Date('2025-04-10T15:00:00.000Z'); // Thursday 10 AM Colombia time (UTC-5)
      const utcDate = BusinessTimeCalculator.colombiaTimeToUtc(mondayHalfPast11am);
      
      const result = BusinessTimeCalculator.calculateBusinessTime(utcDate, 5, 4, mockHolidays);
      const resultColombia = BusinessTimeCalculator.utcToColombiaTime(result);
      
      expect(resultColombia.getDate()).toBe(21); // Monday
      expect(resultColombia.getHours()).toBe(15); // 3 PM
    });
  });
});
