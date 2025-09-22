import express, { Request, Response, NextFunction } from 'express'
import { BusinessTimeResponse, ErrorResponse } from './types'
import { ValidationService } from './validation'
import { HolidaysService, HolidayServiceStatus } from './holidays'
import { BusinessTimeCalculator } from './businessTime'

const app = express()
const PORT = process.env.PORT || 3000
const HOLIDAYS_URL = process.env.HOLIDAYS_URL || ''

// Middleware
app.use(express.json())

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now()
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Query:`, req.query)

    // Log response time and status
    const originalSend = res.send
    res.send = function (data) {
        const duration = Date.now() - startTime
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`)
        return originalSend.call(this, data)
    }

    next()
})

// Main business time calculation endpoint
app.get('/calculate-business-time', async (req: Request, res: Response): Promise<void> => {
    try {
        // Validate request parameters
        const validation = ValidationService.validateRequest(req.query)

        if (!validation.isValid || !validation.parsedRequest) {
            res.status(400).json(validation.error)
            return
        }

        const { days, hours, startDate } = validation.parsedRequest

        // Fetch holidays
        const holidayResult = await HolidaysService.getColombianHolidays(HOLIDAYS_URL)

        // Add service status headers
        res.set({
            'X-Holiday-Service-Status': holidayResult.status,
            'X-Holiday-Data-Source': holidayResult.source,
            'X-Holiday-Last-Updated': holidayResult.lastUpdated
                ? new Date(holidayResult.lastUpdated).toISOString()
                : 'never',
        })

        // Log degraded service status
        if (holidayResult.status !== HolidayServiceStatus.HEALTHY) {
            console.warn(`Holiday service is ${holidayResult.status}, using ${holidayResult.source} data`)
        }

        // Calculate business time
        const resultDate = BusinessTimeCalculator.calculateBusinessTime(startDate, days, hours, holidayResult.holidays)

        const response: BusinessTimeResponse = {
            date: BusinessTimeCalculator.formatToISO(resultDate),
        }

        res.status(200).json(response)
    } catch (error) {
        console.error('Internal server error:', error)
        const errorResponse = ValidationService.createInternalError(
            'An unexpected error occurred while processing your request'
        )
        res.status(500).json(errorResponse)
    }
})

// Holiday service status endpoint
app.get('/holiday-status', async (req: Request, res: Response): Promise<void> => {
    try {
        const serviceStatus = HolidaysService.getServiceStatus()
        let response: any = { ...serviceStatus }

        // Optionally test the service with a fresh call
        if (req.query.test === 'true') {
            console.log('Testing holiday service connectivity...')
            try {
                const testResult = await HolidaysService.getColombianHolidays(HOLIDAYS_URL)
                response.testResult = {
                    success: true,
                    source: testResult.source,
                    status: testResult.status,
                    holidayCount: testResult.holidays.length,
                }
            } catch (error) {
                response.testResult = {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                }
            }
        }

        res.status(200).json(response)
    } catch (error) {
        console.error('Error checking holiday service status:', error)
        const errorResponse = ValidationService.createInternalError('Error retrieving holiday service status')
        res.status(500).json(errorResponse)
    }
})

// Health check endpoint
app.get('/health', (req: Request, res: Response): void => {
    const holidayServiceStatus = HolidaysService.getServiceStatus()

    const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        services: {
            holiday: {
                status: holidayServiceStatus.status,
                circuitBreaker: holidayServiceStatus.circuitState,
                failures: holidayServiceStatus.failures,
                lastFetch: holidayServiceStatus.lastFetch
                    ? new Date(holidayServiceStatus.lastFetch).toISOString()
                    : null,
                cacheAgeMs: holidayServiceStatus.cacheAge,
            },
        },
    }

    // Set overall health status based on critical services
    const httpStatus = holidayServiceStatus.status === HolidayServiceStatus.FAILED ? 503 : 200
    if (httpStatus === 503) {
        healthStatus.status = 'DEGRADED'
    }

    res.status(httpStatus).json(healthStatus)
})

// 404 handler
app.use((req: Request, res: Response): void => {
    const errorResponse: ErrorResponse = {
        error: 'NotFound',
        message: `Endpoint ${req.method} ${req.path} not found`,
    }
    res.status(404).json(errorResponse)
})

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Unhandled error:', error)
    const errorResponse = ValidationService.createInternalError('An unexpected server error occurred')
    res.status(500).json(errorResponse)
})

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, (): void => {
        console.log(`FechasHabilesAPI server running on port ${PORT}`)
        console.log(`Business hours: 8:00 AM - 5:00 PM (Colombia time)`)
        console.log(`Lunch break: 12:00 PM - 1:00 PM`)
        console.log(`Timezone: America/Bogota`)
        console.log(`Holiday service URL: ${HOLIDAYS_URL}`)
        console.log(`Holiday service features: Circuit breaker, retry logic, fallback data`)
        console.log(`Endpoints:`)
        console.log(`   GET /calculate-business-time - Main API endpoint`)
        console.log(`   GET /health - Health check with service status`)
        console.log(`   GET /holiday-status - Detailed holiday service status`)
    })
}

export default app
