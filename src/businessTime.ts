import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz'
import { addDays, getDay, getHours, getMinutes, setHours, setMinutes, addMinutes, subDays } from 'date-fns'
import { WorkingHours, TimeAdjustment, ColombianHolidays } from './types'
import { HolidaysService } from './holidays'

export class BusinessTimeCalculator {
    private static readonly COLOMBIA_TIMEZONE = 'America/Bogota'
    private static readonly WORKING_HOURS: WorkingHours = {
        start: 8, // 8:00 AM
        end: 17, // 5:00 PM
        lunchStart: 12, // 12:00 PM
        lunchEnd: 13, // 1:00 PM
    }

    public static getCurrentColombiaTime(): Date {
        return utcToZonedTime(new Date(), this.COLOMBIA_TIMEZONE)
    }

    public static utcToColombiaTime(utcDate: Date): Date {
        return utcToZonedTime(utcDate, this.COLOMBIA_TIMEZONE)
    }

    public static colombiaTimeToUtc(colombiaDate: Date): Date {
        return zonedTimeToUtc(colombiaDate, this.COLOMBIA_TIMEZONE)
    }

    public static isBusinessDay(date: Date, holidays: ColombianHolidays): boolean {
        const dayOfWeek = getDay(date)
        // Monday = 1, Tuesday = 2, ..., Friday = 5, Saturday = 6, Sunday = 0
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            return false // Weekend
        }

        return !HolidaysService.isHoliday(date, holidays)
    }

    public static isWithinWorkingHours(date: Date): boolean {
        const hours = getHours(date)
        const minutes = getMinutes(date)
        const totalMinutes = hours * 60 + minutes

        const startMinutes = this.WORKING_HOURS.start * 60
        const lunchStartMinutes = this.WORKING_HOURS.lunchStart * 60
        const lunchEndMinutes = this.WORKING_HOURS.lunchEnd * 60
        const endMinutes = this.WORKING_HOURS.end * 60

        return (
            (totalMinutes >= startMinutes && totalMinutes < lunchStartMinutes) ||
            (totalMinutes >= lunchEndMinutes && totalMinutes < endMinutes)
        )
    }

    public static adjustToPrevBusinessTime(date: Date, holidays: ColombianHolidays): TimeAdjustment {
        let adjustedDate = new Date(date)
        let wasAdjusted = false
        let reason = ''
        let movedToPrevBusinessDay = false

        // First, move to nearest previous business day if needed
        while (!this.isBusinessDay(adjustedDate, holidays)) {
            adjustedDate = subDays(adjustedDate, 1)
            wasAdjusted = true
            movedToPrevBusinessDay = true
            reason = 'Moved to next business day (weekend/holiday)'
        }

        // If we moved to a different business day, always start at 8 AM
        if (movedToPrevBusinessDay) {
            adjustedDate = setHours(setMinutes(adjustedDate, 0), this.WORKING_HOURS.end)
            return { date: adjustedDate, wasAdjusted, reason }
        }

        // If we're on the same business day, adjust time to working hours if needed
        const hours = getHours(adjustedDate)
        const minutes = getMinutes(adjustedDate)
        const totalMinutes = hours * 60 + minutes

        if (totalMinutes < this.WORKING_HOURS.start * 60) {
            // Before work starts - set to 5:00 PM of previous business day
            adjustedDate = subDays(adjustedDate, 1)
            adjustedDate = setHours(setMinutes(adjustedDate, 0), this.WORKING_HOURS.end)

            // Check if previous day is also a business day
            while (!this.isBusinessDay(adjustedDate, holidays)) {
                adjustedDate = subDays(adjustedDate, 1)
            }

            wasAdjusted = true
            reason = 'Adjusted to previoius business day end (5:00 PM)'
        } else if (
            totalMinutes >= this.WORKING_HOURS.lunchStart * 60 &&
            totalMinutes < this.WORKING_HOURS.lunchEnd * 60
        ) {
            // During lunch - set to 12:00 PM
            adjustedDate = setHours(setMinutes(adjustedDate, 0), this.WORKING_HOURS.lunchStart)
            wasAdjusted = true
            reason = 'Adjusted to start of lunch break (12:00 PM)'
        } else if (totalMinutes >= this.WORKING_HOURS.end * 60) {
            // After work ends - set to same business day at 5:00 PM
            adjustedDate = setHours(setMinutes(adjustedDate, 0), this.WORKING_HOURS.end)

            wasAdjusted = true
            reason = 'Adjusted to end of business day (after hours)'
        }

        return { date: adjustedDate, wasAdjusted, reason }
    }

    public static addBusinessDays(startDate: Date, businessDays: number, holidays: ColombianHolidays): Date {
        if (businessDays === 0) return startDate

        let currentDate = new Date(startDate)
        let remainingDays = businessDays

        while (remainingDays > 0) {
            currentDate = addDays(currentDate, 1)

            if (this.isBusinessDay(currentDate, holidays)) {
                remainingDays--
            }
        }

        return currentDate
    }

    public static addBusinessHours(startDate: Date, businessHours: number, holidays: ColombianHolidays): Date {
        if (businessHours === 0) return startDate

        let currentDate = new Date(startDate)
        let remainingMinutes = businessHours * 60

        while (remainingMinutes > 0) {
            // Ensure we're on a business day and within working hours
            const adjustment = this.adjustToPrevBusinessTime(currentDate, holidays)
            currentDate = adjustment.date

            const currentHour = getHours(currentDate)
            const currentMinute = getMinutes(currentDate)
            const currentTotalMinutes = currentHour * 60 + currentMinute

            let availableMinutesUntilLunch = 0
            let availableMinutesAfterLunch = 0

            // Calculate available time before lunch
            if (currentTotalMinutes < this.WORKING_HOURS.lunchStart * 60) {
                availableMinutesUntilLunch = this.WORKING_HOURS.lunchStart * 60 - currentTotalMinutes
            }

            // Calculate available time after lunch
            if (currentTotalMinutes < this.WORKING_HOURS.end * 60) {
                const startAfterLunch = Math.max(currentTotalMinutes, this.WORKING_HOURS.lunchEnd * 60)
                availableMinutesAfterLunch = this.WORKING_HOURS.end * 60 - startAfterLunch
            }

            const totalAvailableToday = availableMinutesUntilLunch + availableMinutesAfterLunch

            if (remainingMinutes <= totalAvailableToday) {
                // Can finish today
                if (remainingMinutes <= availableMinutesUntilLunch) {
                    // Finish before lunch
                    currentDate = addMinutes(currentDate, remainingMinutes)
                } else {
                    // Need to go past lunch
                    const minutesToLunch = availableMinutesUntilLunch
                    const minutesAfterLunch = remainingMinutes - minutesToLunch

                    currentDate = addMinutes(currentDate, minutesToLunch)
                    // Jump to after lunch
                    currentDate = setHours(setMinutes(currentDate, 0), this.WORKING_HOURS.lunchEnd)
                    currentDate = addMinutes(currentDate, minutesAfterLunch)
                }
                remainingMinutes = 0
            } else {
                // Use all available time today and move to next business day
                remainingMinutes -= totalAvailableToday
                currentDate = addDays(currentDate, 1)
                currentDate = setHours(setMinutes(currentDate, 0), this.WORKING_HOURS.start)

                // Find next business day
                while (!this.isBusinessDay(currentDate, holidays)) {
                    currentDate = addDays(currentDate, 1)
                }
            }
        }

        return currentDate
    }

    public static calculateBusinessTime(
        startDate: Date | undefined,
        businessDays: number | undefined,
        businessHours: number | undefined,
        holidays: ColombianHolidays
    ): Date {
        let currentDate = startDate ? this.utcToColombiaTime(startDate) : this.getCurrentColombiaTime()

        const adjustment = this.adjustToPrevBusinessTime(currentDate, holidays)
        currentDate = adjustment.date

        if (businessDays && businessDays > 0) {
            currentDate = this.addBusinessDays(currentDate, businessDays, holidays)
        }

        if (businessHours && businessHours > 0) {
            currentDate = this.addBusinessHours(currentDate, businessHours, holidays)
        }

        return this.colombiaTimeToUtc(currentDate)
    }

    public static formatToISO(date: Date): string {
        return date.toISOString()
    }
}
