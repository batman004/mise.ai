/**
 * Sales Mapper
 *
 * Transforms data between API format and domain models.
 * Provides validation and type safety.
 */

import type {
  ISale,
  ISalesMetrics,
  ISalesResponse,
  Sale,
  SalesMetrics,
  SalesResponse,
  TimeOfDay,
  WeatherCondition,
  SpecialEvent,
} from "./sales.domain";
import {
  isTimeOfDay,
  isWeatherCondition,
  isSpecialEvent,
  parseSalesDate,
} from "./sales.domain";

// ============================================================================
// Mapper Functions
// ============================================================================

/**
 * Map API sale item to domain sale item
 */
export function mapISaleToSale(item: ISale): Sale {
  // Validate required fields
  if (!item.menu_item || typeof item.menu_item !== "string") {
    throw new Error("Invalid menu_item in sale item");
  }

  if (
    typeof item.quantity_ordered !== "number" ||
    isNaN(item.quantity_ordered)
  ) {
    throw new Error("Invalid quantity_ordered in sale item");
  }

  if (typeof item.quantity_sold !== "number" || isNaN(item.quantity_sold)) {
    throw new Error("Invalid quantity_sold in sale item");
  }

  if (typeof item.quantity_wasted !== "number" || isNaN(item.quantity_wasted)) {
    throw new Error("Invalid quantity_wasted in sale item");
  }

  if (typeof item.ingredient_cost !== "number" || isNaN(item.ingredient_cost)) {
    throw new Error("Invalid ingredient_cost in sale item");
  }

  if (typeof item.selling_price !== "number" || isNaN(item.selling_price)) {
    throw new Error("Invalid selling_price in sale item");
  }

  if (typeof item.total_revenue !== "number" || isNaN(item.total_revenue)) {
    throw new Error("Invalid total_revenue in sale item");
  }

  if (typeof item.customer_count !== "number" || isNaN(item.customer_count)) {
    throw new Error("Invalid customer_count in sale item");
  }

  // Validate enums
  if (!isTimeOfDay(item.time_of_day)) {
    throw new Error(`Invalid time_of_day: ${item.time_of_day}`);
  }

  if (!isWeatherCondition(item.weather_condition)) {
    throw new Error(`Invalid weather_condition: ${item.weather_condition}`);
  }

  if (!isSpecialEvent(item.special_event)) {
    throw new Error(`Invalid special_event: ${item.special_event}`);
  }

  // Parse dates
  const date = parseSalesDate(item.date);
  const timeOfOrder = parseSalesDate(item.time_of_order);

  const mapped: Sale = {
    date,
    menuItem: item.menu_item,
    quantityOrdered: item.quantity_ordered,
    quantitySold: item.quantity_sold,
    quantityWasted: item.quantity_wasted,
    ingredientCost: item.ingredient_cost,
    sellingPrice: item.selling_price,
    totalRevenue: item.total_revenue,
    customerCount: item.customer_count,
    timeOfDay: item.time_of_day as TimeOfDay,
    weatherCondition: item.weather_condition as WeatherCondition,
    specialEvent: item.special_event as SpecialEvent,
    timeOfOrder,
  };

  return mapped;
}

/**
 * Map domain sale item to API sale item
 */
export function mapSaleToISale(item: Sale): ISale {
  const mapped: ISale = {
    date: item.date.toISOString().split("T")[0], // YYYY-MM-DD format
    menu_item: item.menuItem,
    quantity_ordered: item.quantityOrdered,
    quantity_sold: item.quantitySold,
    quantity_wasted: item.quantityWasted,
    ingredient_cost: item.ingredientCost,
    selling_price: item.sellingPrice,
    total_revenue: item.totalRevenue,
    customer_count: item.customerCount,
    time_of_day: item.timeOfDay,
    weather_condition: item.weatherCondition,
    special_event: item.specialEvent,
    time_of_order: item.timeOfOrder.toISOString(),
  };

  return mapped;
}

/**
 * Map API sales metrics to domain sales metrics
 */
export function mapISalesMetricsToSalesMetrics(
  metrics: ISalesMetrics
): SalesMetrics {
  // Handle empty metrics object (when no data is available)
  if (!metrics || Object.keys(metrics).length === 0) {
    return {
      revenueByMonth: [],
      weatherConditionWastage: {
        totalWastageByWeather: {},
        avgWastageByWeather: {},
      },
      specialEventWastage: {
        totalWastageBySpecialEvent: {},
        avgWastageBySpecialEvent: {},
      },
      wastageTrends: {
        highWastageItems: [],
        lowWastageItems: [],
      },
    };
  }

  const mapped: SalesMetrics = {
    revenueByMonth: (metrics.revenue_by_month || []).map((item) => ({
      month: item.month,
      revenue: item.revenue,
    })),
    weatherConditionWastage: {
      totalWastageByWeather:
        metrics.weather_condition_wastage?.total_wastage_by_weather || {},
      avgWastageByWeather:
        metrics.weather_condition_wastage?.avg_wastage_by_weather || {},
    },
    specialEventWastage: {
      totalWastageBySpecialEvent:
        metrics.special_event_wastage?.total_wastage_by_special_event || {},
      avgWastageBySpecialEvent:
        metrics.special_event_wastage?.avg_wastage_by_special_event || {},
    },
    wastageTrends: {
      highWastageItems: (metrics.wastage_trends?.high_wastage_items || []).map(
        (item) => ({
          menuItem: item.menu_item,
          value: item.val,
        })
      ),
      lowWastageItems: (metrics.wastage_trends?.low_wastage_items || []).map(
        (item) => ({
          menuItem: item.menu_item,
          value: item.val,
        })
      ),
    },
  };

  return mapped;
}

/**
 * Map domain sales metrics to API sales metrics
 */
export function mapSalesMetricsToISalesMetrics(
  metrics: SalesMetrics
): ISalesMetrics {
  const mapped: ISalesMetrics = {
    revenue_by_month: metrics.revenueByMonth.map((item) => ({
      month: item.month,
      revenue: item.revenue,
    })),
    weather_condition_wastage: {
      total_wastage_by_weather:
        metrics.weatherConditionWastage.totalWastageByWeather,
      avg_wastage_by_weather:
        metrics.weatherConditionWastage.avgWastageByWeather,
    },
    special_event_wastage: {
      total_wastage_by_special_event:
        metrics.specialEventWastage.totalWastageBySpecialEvent,
      avg_wastage_by_special_event:
        metrics.specialEventWastage.avgWastageBySpecialEvent,
    },
    wastage_trends: {
      high_wastage_items: metrics.wastageTrends.highWastageItems.map(
        (item) => ({
          menu_item: item.menuItem,
          val: item.value,
        })
      ),
      low_wastage_items: metrics.wastageTrends.lowWastageItems.map((item) => ({
        menu_item: item.menuItem,
        val: item.value,
      })),
    },
  };

  return mapped;
}

/**
 * Map API sales response to domain sales response
 */
export function mapISalesResponseToSalesResponse(
  response: ISalesResponse
): SalesResponse {
  // Validate required fields
  if (typeof response.user_id !== "number" || isNaN(response.user_id)) {
    throw new Error("Invalid user_id in sales response");
  }

  if (typeof response.total_rows !== "number" || isNaN(response.total_rows)) {
    throw new Error("Invalid total_rows in sales response");
  }

  if (
    typeof response.rows_returned !== "number" ||
    isNaN(response.rows_returned)
  ) {
    throw new Error("Invalid rows_returned in sales response");
  }

  if (!Array.isArray(response.data)) {
    throw new Error("Invalid data array in sales response");
  }

  // Map sales data
  const sales: Sale[] = response.data.map(mapISaleToSale);

  // Map metrics if present
  let metrics: SalesMetrics | undefined;
  if (response.metrics) {
    metrics = mapISalesMetricsToSalesMetrics(response.metrics);
  }

  const mapped: SalesResponse = {
    userId: response.user_id,
    totalRows: response.total_rows,
    rowsReturned: response.rows_returned,
    data: sales,
    metrics,
  };

  return mapped;
}

/**
 * Map domain sales response to API sales response
 */
export function mapSalesResponseToISalesResponse(
  response: SalesResponse
): ISalesResponse {
  const mapped: ISalesResponse = {
    user_id: response.userId,
    total_rows: response.totalRows,
    rows_returned: response.rowsReturned,
    data: response.data.map(mapSaleToISale),
  };

  if (response.metrics) {
    mapped.metrics = mapSalesMetricsToISalesMetrics(response.metrics);
  }

  return mapped;
}

// ============================================================================
// Exported Mapper Object (Alternative API)
// ============================================================================

export const SalesMapper = {
  toSale: mapISaleToSale,
  fromSale: mapSaleToISale,
  toMetrics: mapISalesMetricsToSalesMetrics,
  fromMetrics: mapSalesMetricsToISalesMetrics,
  toResponse: mapISalesResponseToSalesResponse,
  fromResponse: mapSalesResponseToISalesResponse,
} as const;

export default SalesMapper;
