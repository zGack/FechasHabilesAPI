import axios from 'axios'
import { ColombianHolidays, ErrorCodes, ErrorResponse } from './types'
import { FALLBACK_COLOMBIAN_HOLIDAYS, getFallbackHolidays } from './fallbackHolidays'

interface CircuitBreakerState {
    failures: number
    lastFailureTime: number
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

export enum HolidayServiceStatus {
    HEALTHY = 'HEALTHY',
    DEGRADED = 'DEGRADED',
    FAILED = 'FAILED',
}

export interface HolidayServiceResult {
    holidays: ColombianHolidays
    status: HolidayServiceStatus
    source: 'CACHE' | 'API' | 'FALLBACK'
    lastUpdated: number | null
}

export class HolidaysService {
    private static cache: ColombianHolidays | null = null
    private static lastFetch: number = 0
    private static readonly CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

    // Circuit breaker configuration
    private static circuitBreaker: CircuitBreakerState = {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
    }
    private static readonly MAX_FAILURES = 3
    private static readonly CIRCUIT_TIMEOUT = 5 * 60 * 1000 // 5 minutes

    // Retry configuration
    private static readonly MAX_RETRIES = 3
    private static readonly BASE_DELAY = 1000 // 1 second

    public static async getColombianHolidays(holidaysUrl: string): Promise<HolidayServiceResult> {
        const now = Date.now()

        // Return cached data if still valid
        if (this.cache && now - this.lastFetch < this.CACHE_DURATION) {
            return {
                holidays: this.cache,
                status: HolidayServiceStatus.HEALTHY,
                source: 'CACHE',
                lastUpdated: this.lastFetch,
            }
        }

        // Check circuit breaker state
        if (this.isCircuitOpen(now)) {
            console.warn('Circuit breaker is OPEN, using fallback holidays')
            return this.getFallbackResult()
        }

        // Attempt to fetch fresh data with retry logic
        try {
            const holidays = await this.fetchWithRetry(holidaysUrl)

            // Success - reset circuit breaker and update cache
            this.resetCircuitBreaker()
            this.cache = holidays
            this.lastFetch = now

            console.log('Successfully fetched fresh holidays data')
            return {
                holidays,
                status: HolidayServiceStatus.HEALTHY,
                source: 'API',
                lastUpdated: now,
            }
        } catch (error) {
            console.error('Failed to fetch holidays after retries:', error)
            this.recordFailure(now)

            // Return cached data if available
            if (this.cache) {
                console.warn('Using stale cached holidays data due to API failure')
                return {
                    holidays: this.cache,
                    status: HolidayServiceStatus.DEGRADED,
                    source: 'CACHE',
                    lastUpdated: this.lastFetch,
                }
            }

            // Final fallback to static data
            console.warn('Using static fallback holidays data')
            return this.getFallbackResult()
        }
    }

    private static async fetchWithRetry(url: string): Promise<ColombianHolidays> {
        let lastError: Error

        for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.calculateBackoffDelay(attempt)
                    console.log(`Retrying holiday fetch in ${delay}ms (attempt ${attempt + 1}/${this.MAX_RETRIES + 1})`)
                    await this.sleep(delay)
                }

                const response = await axios.get<ColombianHolidays>(url, {
                    timeout: 10000,
                    headers: {
                        Accept: 'application/json',
                        'User-Agent': 'FechasHabilesAPI/1.0.0',
                    },
                })

                if (!Array.isArray(response.data)) {
                    throw new Error('Invalid response format from holidays service')
                }

                return response.data
            } catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error')
                console.warn(`Holiday fetch attempt ${attempt + 1} failed:`, lastError.message)
            }
        }

        throw lastError!
    }

    private static calculateBackoffDelay(attempt: number): number {
        // Exponential backoff with jitter
        const exponentialDelay = this.BASE_DELAY * Math.pow(2, attempt - 1)
        const jitter = Math.random() * 0.1 * exponentialDelay
        return Math.min(exponentialDelay + jitter, 10000) // Cap at 10 seconds
    }

    private static sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    private static isCircuitOpen(now: number): boolean {
        if (this.circuitBreaker.state === 'OPEN') {
            if (now - this.circuitBreaker.lastFailureTime > this.CIRCUIT_TIMEOUT) {
                this.circuitBreaker.state = 'HALF_OPEN'
                console.log('Circuit breaker moving to HALF_OPEN state')
                return false
            }
            return true
        }
        return false
    }

    private static recordFailure(now: number): void {
        this.circuitBreaker.failures++
        this.circuitBreaker.lastFailureTime = now

        if (this.circuitBreaker.failures >= this.MAX_FAILURES) {
            this.circuitBreaker.state = 'OPEN'
            console.warn(`Circuit breaker opened after ${this.circuitBreaker.failures} failures`)
        }
    }

    private static resetCircuitBreaker(): void {
        if (this.circuitBreaker.failures > 0) {
            console.log('Circuit breaker reset - service recovered')
        }
        this.circuitBreaker.failures = 0
        this.circuitBreaker.state = 'CLOSED'
    }

    private static getFallbackResult(): HolidayServiceResult {
        const currentYear = new Date().getFullYear()
        const holidays = getFallbackHolidays(currentYear, currentYear + 1)

        return {
            holidays,
            status: HolidayServiceStatus.FAILED,
            source: 'FALLBACK',
            lastUpdated: null,
        }
    }

    public static getServiceStatus(): {
        status: HolidayServiceStatus
        circuitState: string
        failures: number
        lastFetch: number | null
        cacheAge: number | null
    } {
        const now = Date.now()
        const cacheAge = this.lastFetch ? now - this.lastFetch : null

        let status = HolidayServiceStatus.HEALTHY
        if (this.circuitBreaker.state === 'OPEN') {
            status = HolidayServiceStatus.FAILED
        } else if (cacheAge && cacheAge > this.CACHE_DURATION) {
            status = HolidayServiceStatus.DEGRADED
        }

        return {
            status,
            circuitState: this.circuitBreaker.state,
            failures: this.circuitBreaker.failures,
            lastFetch: this.lastFetch || null,
            cacheAge,
        }
    }

    public static isHoliday(date: Date, holidays: ColombianHolidays): boolean {
        const dateStr = date.toISOString().split('T')[0]
        if (!dateStr) return false
        return holidays.includes(dateStr)
    }

    public static createHolidaysError(originalError: unknown): ErrorResponse {
        return {
            error: ErrorCodes.HOLIDAYS_SERVICE_ERROR,
            message: `Unable to fetch holidays data: ${originalError instanceof Error ? originalError.message : 'Unknown error'}`,
        }
    }
}
