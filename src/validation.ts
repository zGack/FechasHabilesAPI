import { ValidationResult, ErrorResponse, ErrorCodes } from './types'

export class ValidationService {
    public static validateRequest(query: Record<string, unknown>): ValidationResult {
        const { days, hours, date } = query

        // Check if at least one parameter is provided
        if (days === undefined && hours === undefined) {
            return {
                isValid: false,
                error: {
                    error: ErrorCodes.INVALID_PARAMETERS,
                    message: 'At least one parameter (days or hours) must be provided',
                },
            }
        }

        // Validate days parameter
        let parsedDays: number | undefined
        if (days !== undefined) {
            if (typeof days !== 'string' || isNaN(Number(days))) {
                return {
                    isValid: false,
                    error: {
                        error: ErrorCodes.INVALID_PARAMETERS,
                        message: 'Days parameter must be a valid number',
                    },
                }
            }

            parsedDays = parseInt(days, 10)
            if (parsedDays < 0) {
                return {
                    isValid: false,
                    error: {
                        error: ErrorCodes.NEGATIVE_VALUES,
                        message: 'Days parameter must be a positive integer',
                    },
                }
            }
        }

        // Validate hours parameter
        let parsedHours: number | undefined
        if (hours !== undefined) {
            if (typeof hours !== 'string' || isNaN(Number(hours))) {
                return {
                    isValid: false,
                    error: {
                        error: ErrorCodes.INVALID_PARAMETERS,
                        message: 'Hours parameter must be a valid number',
                    },
                }
            }

            parsedHours = parseInt(hours, 10)
            if (parsedHours < 0) {
                return {
                    isValid: false,
                    error: {
                        error: ErrorCodes.NEGATIVE_VALUES,
                        message: 'Hours parameter must be a positive integer',
                    },
                }
            }
        }

        // Validate date parameter
        let parsedDate: Date | undefined
        if (date !== undefined) {
            if (typeof date !== 'string') {
                return {
                    isValid: false,
                    error: {
                        error: ErrorCodes.INVALID_PARAMETERS,
                        message: 'Date parameter must be a string',
                    },
                }
            }

            // Check ISO 8601 format with Z suffix
            const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/
            if (!iso8601Regex.test(date)) {
                return {
                    isValid: false,
                    error: {
                        error: ErrorCodes.INVALID_DATE_FORMAT,
                        message: 'Date must be in ISO 8601 format with Z suffix (e.g., 2025-08-01T14:00:00Z)',
                    },
                }
            }

            parsedDate = new Date(date)
            if (isNaN(parsedDate.getTime())) {
                return {
                    isValid: false,
                    error: {
                        error: ErrorCodes.INVALID_DATE_FORMAT,
                        message: 'Invalid date',
                    },
                }
            }
        }

        return {
            isValid: true,
            parsedRequest: {
                days: parsedDays,
                hours: parsedHours,
                startDate: parsedDate,
            },
        }
    }

    public static createInternalError(message: string): ErrorResponse {
        return {
            error: ErrorCodes.INTERNAL_ERROR,
            message,
        }
    }
}
