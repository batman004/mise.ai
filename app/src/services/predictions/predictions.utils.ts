/**
 * Predictions Utility Functions
 *
 * Helper functions for working with prediction data
 */

import type { Sale } from "../sales/sales.domain";
import type { PredictionItem } from "./predictions.domain";

// ============================================================================
// Revenue Calculation Helpers
// ============================================================================

/**
 * Calculate total predicted revenue from prediction items using average prices
 *
 * @param predictions - Array of prediction items with menu items and quantities
 * @param historicalSales - Historical sales data to extract pricing information
 * @returns Total predicted revenue
 */
export function calculatePredictedRevenue(
  predictions: PredictionItem[],
  historicalSales: Sale[]
): number {
  // Build a map of menu items to their average selling prices
  const menuItemPrices = new Map<string, number[]>();

  historicalSales.forEach((sale) => {
    const existingPrices = menuItemPrices.get(sale.menu_item) || [];
    existingPrices.push(sale.selling_price);
    menuItemPrices.set(sale.menu_item, existingPrices);
  });

  // Calculate average prices
  const averagePrices = new Map<string, number>();
  menuItemPrices.forEach((prices, menuItem) => {
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    averagePrices.set(menuItem, avgPrice);
  });

  // Calculate total revenue from predictions
  let totalRevenue = 0;

  predictions.forEach((prediction) => {
    const avgPrice = averagePrices.get(prediction.menuItem);

    if (avgPrice) {
      totalRevenue += prediction.predictedQuantitySold * avgPrice;
    } else {
      // If no historical price data, use a default estimate or skip
      console.warn(
        `No pricing data for menu item: ${prediction.menuItem}. Using default price of $10.`
      );
      totalRevenue += prediction.predictedQuantitySold * 10;
    }
  });

  return totalRevenue;
}

/**
 * Build a price map from historical sales for quick lookups
 *
 * @param historicalSales - Historical sales data
 * @returns Map of menu items to average selling prices
 */
export function buildPriceMap(historicalSales: Sale[]): Map<string, number> {
  const menuItemPrices = new Map<string, number[]>();

  historicalSales.forEach((sale) => {
    const prices = menuItemPrices.get(sale.menu_item) || [];
    prices.push(sale.selling_price);
    menuItemPrices.set(sale.menu_item, prices);
  });

  // Calculate average prices
  const averagePrices = new Map<string, number>();
  menuItemPrices.forEach((prices, menuItem) => {
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    averagePrices.set(menuItem, avgPrice);
  });

  return averagePrices;
}

/**
 * Calculate daily revenue from historical sales
 *
 * @param sales - Array of sales records
 * @returns Array of { date: string, revenue: number }
 */
export function calculateDailyRevenue(
  sales: Sale[]
): Array<{ date: string; revenue: number }> {
  const dailyRevenue = new Map<string, number>();

  sales.forEach((sale) => {
    const dateStr = sale.date.toISOString().split("T")[0]; // YYYY-MM-DD
    const revenue = dailyRevenue.get(dateStr) || 0;
    dailyRevenue.set(dateStr, revenue + sale.total_revenue);
  });

  // Convert to array and sort by date
  return Array.from(dailyRevenue.entries())
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Generate prediction dates for the next N days
 *
 * @param startDate - Starting date (defaults to tomorrow)
 * @param days - Number of days to generate (defaults to 30)
 * @returns Array of Date objects
 */
export function generatePredictionDates(
  startDate: Date = new Date(Date.now() + 24 * 60 * 60 * 1000),
  days: number = 30
): Date[] {
  const dates: Date[] = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date);
  }

  return dates;
}

/**
 * Calculate a simple linear trajectory from historical revenue
 *
 * @param historicalRevenue - Array of historical revenue data points
 * @param futureDays - Number of days to project into the future
 * @returns Array of { date: string, trajectory: number }
 */
export function calculateTrajectory(
  historicalRevenue: Array<{ date: string; revenue: number }>,
  futureDays: number
): Array<{ date: string; trajectory: number }> {
  if (historicalRevenue.length < 2) {
    return [];
  }

  // Simple linear regression
  const n = historicalRevenue.length;
  const xValues = historicalRevenue.map((_, i) => i);
  const yValues = historicalRevenue.map((d) => d.revenue);

  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Project trajectory into the future
  const trajectory: Array<{ date: string; trajectory: number }> = [];
  const lastDate = new Date(historicalRevenue[historicalRevenue.length - 1].date);

  for (let i = 1; i <= futureDays; i++) {
    const projectedValue = slope * (n + i - 1) + intercept;
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);

    trajectory.push({
      date: date.toISOString().split("T")[0],
      trajectory: Math.max(0, projectedValue), // Don't allow negative revenue
    });
  }

  return trajectory;
}
