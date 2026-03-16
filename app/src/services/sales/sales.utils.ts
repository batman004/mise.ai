/**
 * Sales Utilities
 *
 * Utility functions for working with sales data.
 */

import type { Sale } from "./sales.domain";

/**
 * Find the most recent sale date from sales data
 *
 * @param sales - Array of sales data
 * @returns The most recent date, or null if no sales data
 */
export function getLastSaleDate(sales: Sale[]): Date | null {
  if (!sales || sales.length === 0) {
    return null;
  }

  // Find the maximum date from all sales
  const maxDate = sales.reduce((latest, sale) => {
    return sale.date > latest ? sale.date : latest;
  }, sales[0].date);

  return maxDate;
}

/**
 * Get the next day after the last sale date
 *
 * @param sales - Array of sales data
 * @returns The next day after the last sale, or tomorrow if no sales data
 */
export function getNextDayAfterLastSale(sales: Sale[]): Date {
  const lastSaleDate = getLastSaleDate(sales);

  if (!lastSaleDate) {
    // If no sales data, return tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  // Return the day after the last sale
  const nextDay = new Date(lastSaleDate);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay;
}

/**
 * Get the start of the week containing the given date
 *
 * @param date - The date to find the week start for
 * @returns The start of the week (Monday)
 */
export function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get the start of the month containing the given date
 *
 * @param date - The date to find the month start for
 * @returns The start of the month
 */
export function getMonthStart(date: Date): Date {
  const monthStart = new Date(date);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  return monthStart;
}

/**
 * Get the last week's start date based on sales data
 *
 * @param sales - Array of sales data
 * @returns The start of the last week with sales data, or last week if no sales
 */
export function getLastWeekStart(sales: Sale[]): Date {
  const lastSaleDate = getLastSaleDate(sales);
  
  if (!lastSaleDate) {
    // If no sales data, return last week
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    return getWeekStart(lastWeek);
  }

  // Get the week start of the last sale date
  return getWeekStart(lastSaleDate);
}

/**
 * Get the last month's start date based on sales data
 *
 * @param sales - Array of sales data
 * @returns The start of the last month with sales data, or last month if no sales
 */
export function getLastMonthStart(sales: Sale[]): Date {
  const lastSaleDate = getLastSaleDate(sales);
  
  if (!lastSaleDate) {
    // If no sales data, return last month
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    return getMonthStart(lastMonth);
  }

  // Get the month start of the last sale date
  return getMonthStart(lastSaleDate);
}

/**
 * Get the next week's start date based on sales data
 *
 * @param sales - Array of sales data
 * @returns The start of the next week after the last sale
 */
export function getNextWeekStart(sales: Sale[]): Date {
  const lastWeekStart = getLastWeekStart(sales);
  const nextWeek = new Date(lastWeekStart);
  nextWeek.setDate(nextWeek.getDate() + 7);
  return nextWeek;
}

/**
 * Get the next month's start date based on sales data
 *
 * @param sales - Array of sales data
 * @returns The start of the next month after the last sale
 */
export function getNextMonthStart(sales: Sale[]): Date {
  const lastMonthStart = getLastMonthStart(sales);
  const nextMonth = new Date(lastMonthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  return nextMonth;
}
