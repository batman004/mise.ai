/**
 * Sales Domain Types
 *
 * Defines TypeScript interfaces and enums for the sales service.
 * Follows the same pattern as predictions.domain.ts
 */

import {
  IconCloud,
  IconCloudRain,
  IconMistOff,
  IconSun,
} from "@tabler/icons-react";

// ============================================================================
// Enums
// ============================================================================

export enum TimeOfDay {
  LUNCH = "lunch",
  DINNER = "dinner",
  BREAKFAST = "breakfast",
}

export enum WeatherCondition {
  CLEAR = "clear",
  SUNNY = "sunny",
  RAINY = "rainy",
  CLOUDY = "cloudy",
}

export enum SpecialEvent {
  NONE = "none",
  VALENTINES_DAY = "valentines_day",
  CHEF_SPECIAL = "chef_special",
  WEEKEND_RUSH = "weekend_rush",
  FAMILY_DAY = "family_day",
  PAYDAY_RUSH = "payday_rush",
}

// ============================================================================
// API Interfaces (Raw data from backend)
// ============================================================================

/**
 * Individual sale item from API (raw format)
 */
export interface ISale {
  date: string;
  menu_item: string;
  quantity_ordered: number;
  quantity_sold: number;
  quantity_wasted: number;
  ingredient_cost: number;
  selling_price: number;
  total_revenue: number;
  customer_count: number;
  time_of_day: string;
  weather_condition: string;
  special_event: string;
  time_of_order: string;
}

/**
 * Sales metrics from API (raw format)
 */
export interface ISalesMetrics {
  revenue_by_month: {
    month: string;
    revenue: number;
  }[];
  weather_condition_wastage: {
    total_wastage_by_weather: {
      [key in WeatherCondition]: number;
    };
    avg_wastage_by_weather: {
      [key in WeatherCondition]: number;
    };
  };
  special_event_wastage: {
    total_wastage_by_special_event: {
      [key in SpecialEvent]: number;
    };
    avg_wastage_by_special_event: {
      [key in Exclude<SpecialEvent, SpecialEvent.NONE>]: number;
    };
  };
  wastage_trends: {
    high_wastage_items: {
      menu_item: string;
      val: number;
    }[];
    low_wastage_items: {
      menu_item: string;
      val: number;
    }[];
  };
}

/**
 * Sales response from API (raw format)
 */
export interface ISalesResponse {
  user_id: number;
  total_rows: number;
  rows_returned: number;
  data: ISale[];
  metrics?: ISalesMetrics;
}

/**
 * Request parameters for getting sales data
 */
export interface IGetSalesRequest {
  user_id: number;
  page?: number;
  limit?: number;
  order?: string;
  order_direction?: "asc" | "desc";
  since?: string;
  until?: string;
  with_metrics?: boolean;
}

// ============================================================================
// Domain Interfaces (Application-facing, with proper types)
// ============================================================================

/**
 * Individual sale item (domain model)
 */
export interface Sale {
  date: Date;
  menuItem: string;
  quantityOrdered: number;
  quantitySold: number;
  quantityWasted: number;
  ingredientCost: number;
  sellingPrice: number;
  totalRevenue: number;
  customerCount: number;
  timeOfDay: TimeOfDay;
  weatherCondition: WeatherCondition;
  specialEvent: SpecialEvent;
  timeOfOrder: Date;
}

/**
 * Sales metrics (domain model)
 */
export interface SalesMetrics {
  revenueByMonth: {
    month: string;
    revenue: number;
  }[];
  weatherConditionWastage: {
    totalWastageByWeather: {
      [key in WeatherCondition]: number;
    };
    avgWastageByWeather: {
      [key in WeatherCondition]: number;
    };
  };
  specialEventWastage: {
    totalWastageBySpecialEvent: {
      [key in SpecialEvent]: number;
    };
    avgWastageBySpecialEvent: {
      [key in Exclude<SpecialEvent, SpecialEvent.NONE>]: number;
    };
  };
  wastageTrends: {
    highWastageItems: {
      menuItem: string;
      value: number;
    }[];
    lowWastageItems: {
      menuItem: string;
      value: number;
    }[];
  };
}

/**
 * Sales response (domain model)
 */
export interface SalesResponse {
  userId: number;
  totalRows: number;
  rowsReturned: number;
  data: Sale[];
  metrics?: SalesMetrics;
}

/**
 * Request parameters for getting sales data (domain model)
 */
export interface GetSalesRequest {
  userId: number;
  page?: number;
  limit?: number;
  order?: string;
  orderDirection?: "asc" | "desc";
  since?: Date;
  until?: Date;
  withMetrics?: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a value is a valid TimeOfDay
 */
export function isTimeOfDay(value: any): value is TimeOfDay {
  return Object.values(TimeOfDay).includes(value);
}

/**
 * Check if a value is a valid WeatherCondition
 */
export function isWeatherCondition(value: any): value is WeatherCondition {
  return Object.values(WeatherCondition).includes(value);
}

/**
 * Check if a value is a valid SpecialEvent
 */
export function isSpecialEvent(value: any): value is SpecialEvent {
  return Object.values(SpecialEvent).includes(value);
}

/**
 * Format date to ISO string
 */
export function formatSalesDate(date: Date): string {
  return date.toISOString();
}

/**
 * Parse ISO string to Date
 */
export function parseSalesDate(dateStr: string): Date {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateStr}`);
  }
  return date;
}

// ============================================================================
// UI Helper Objects
// ============================================================================

export const WeatherConditionNames = {
  [WeatherCondition.CLEAR]: "Clear",
  [WeatherCondition.SUNNY]: "Sunny",
  [WeatherCondition.RAINY]: "Rainy",
  [WeatherCondition.CLOUDY]: "Cloudy",
} satisfies Record<WeatherCondition, string>;

export const WeatherConditionIcons = {
  [WeatherCondition.CLEAR]: IconMistOff,
  [WeatherCondition.SUNNY]: IconSun,
  [WeatherCondition.RAINY]: IconCloudRain,
  [WeatherCondition.CLOUDY]: IconCloud,
} satisfies Record<WeatherCondition, typeof IconCloud>;