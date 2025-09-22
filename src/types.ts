export interface BusinessTimeRequest {
    days?: number
    hours?: number
    date?: string
}

export interface BusinessTimeResponse {
    date: string
}

export interface ErrorResponse {
    error: string
    message: string
}

export interface WorkingHours {
    start: number
    end: number
    lunchStart: number
    lunchEnd: number
}

export interface BusinessTimeCalculation {
    startDate: Date
    businessDays: number
    businessHours: number
    timezone: string
}

export interface HolidayDate {
    date: string
}

export type ColombianHolidays = string[]

export interface BusinessRules {
    workingHours: WorkingHours
    workingDays: number[]
    timezone: string
    holidaysUrl: string
}

export interface TimeAdjustment {
    date: Date
    wasAdjusted: boolean
    reason?: string
}

export enum ErrorCodes {
    INVALID_PARAMETERS = 'InvalidParameters',
    INVALID_DATE_FORMAT = 'InvalidDateFormat',
    NEGATIVE_VALUES = 'NegativeValues',
    HOLIDAYS_SERVICE_ERROR = 'HolidaysServiceError',
    INTERNAL_ERROR = 'InternalError',
}

export interface ValidationResult {
    isValid: boolean
    error?: ErrorResponse
    parsedRequest?: {
        days: number | undefined
        hours: number | undefined
        startDate: Date | undefined
    }
}

