import { ColombianHolidays } from './types'

/**
 * Static fallback holidays for Colombia (2024-2025)
 * Used when external holiday service is unavailable
 * Source: Official Colombian holiday calendar
 */
export const FALLBACK_COLOMBIAN_HOLIDAYS: ColombianHolidays = [
    // 2024 holidays
    '2024-01-01', // New Year's Day
    '2024-01-08', // Epiphany (moved to Monday)
    '2024-03-25', // Saint Joseph's Day (moved to Monday)
    '2024-03-28', // Maundy Thursday
    '2024-03-29', // Good Friday
    '2024-05-01', // Labor Day
    '2024-05-13', // Ascension Day (moved to Monday)
    '2024-06-03', // Corpus Christi (moved to Monday)
    '2024-06-10', // Sacred Heart (moved to Monday)
    '2024-07-01', // Saint Peter and Saint Paul (moved to Monday)
    '2024-07-20', // Independence Day
    '2024-08-07', // Battle of Boyacá
    '2024-08-19', // Assumption of Mary (moved to Monday)
    '2024-10-14', // Columbus Day (moved to Monday)
    '2024-11-04', // All Saints' Day (moved to Monday)
    '2024-11-11', // Independence of Cartagena (moved to Monday)
    '2024-12-08', // Immaculate Conception
    '2024-12-25', // Christmas Day

    // 2025 holidays
    '2025-01-01', // New Year's Day
    '2025-01-06', // Epiphany (moved to Monday)
    '2025-03-24', // Saint Joseph's Day (moved to Monday)
    '2025-04-17', // Maundy Thursday
    '2025-04-18', // Good Friday
    '2025-05-01', // Labor Day
    '2025-06-02', // Ascension Day (moved to Monday)
    '2025-06-23', // Corpus Christi (moved to Monday)
    '2025-06-30', // Sacred Heart (moved to Monday)
    '2025-06-30', // Saint Peter and Saint Paul (moved to Monday)
    '2025-07-20', // Independence Day
    '2025-08-07', // Battle of Boyacá
    '2025-08-18', // Assumption of Mary (moved to Monday)
    '2025-10-13', // Columbus Day (moved to Monday)
    '2025-11-03', // All Saints' Day (moved to Monday)
    '2025-11-17', // Independence of Cartagena (moved to Monday)
    '2025-12-08', // Immaculate Conception
    '2025-12-25', // Christmas Day
]

/**
 * Get fallback holidays filtered by year range for efficiency
 */
export function getFallbackHolidays(startYear?: number, endYear?: number): ColombianHolidays {
    if (!startYear && !endYear) {
        return FALLBACK_COLOMBIAN_HOLIDAYS
    }

    return FALLBACK_COLOMBIAN_HOLIDAYS.filter((holiday) => {
        const year = new Date(holiday).getFullYear()
        const afterStart = !startYear || year >= startYear
        const beforeEnd = !endYear || year <= endYear
        return afterStart && beforeEnd
    })
}

