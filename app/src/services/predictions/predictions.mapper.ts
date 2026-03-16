/**
 * Predictions Mapper
 *
 * Transforms data between API format and domain models.
 * Provides validation and type safety.
 */

import type {
  IPredictionItem,
  IPredictionResult,
  PredictionItem,
  PredictionResult,
} from "./predictions.domain";
import { isPredictionStatus } from "./predictions.domain";

// ============================================================================
// Mapper Functions
// ============================================================================

/**
 * Map API prediction item to domain prediction item
 */
export function mapIPredictionItemToPredictionItem(
  item: IPredictionItem
): PredictionItem {
  if (!item.menu_item || typeof item.menu_item !== "string") {
    throw new Error("Invalid menu_item in prediction item");
  }

  if (
    typeof item.predicted_quantity_sold !== "number" ||
    isNaN(item.predicted_quantity_sold)
  ) {
    throw new Error("Invalid predicted_quantity_sold in prediction item");
  }

  if (
    typeof item.recommended_order_qty !== "number" ||
    isNaN(item.recommended_order_qty)
  ) {
    throw new Error("Invalid recommended_order_qty in prediction item");
  }

  return {
    date: new Date(item.date),
    menuItem: item.menu_item,
    timeOfDay: item.time_of_day,
    specialEvent: item.special_event,
    weatherCondition: item.weather_condition,
    recommendedOrderQty: item.recommended_order_qty,
    predictedQuantitySold: item.predicted_quantity_sold,
  };
}

/**
 * Map domain prediction item to API prediction item
 */
export function mapPredictionItemToIPredictionItem(
  item: PredictionItem
): IPredictionItem {
  return {
    date: item.date.toISOString(),
    menu_item: item.menuItem,
    time_of_day: item.timeOfDay,
    special_event: item.specialEvent,
    weather_condition: item.weatherCondition,
    recommended_order_qty: item.recommendedOrderQty,
    predicted_quantity_sold: item.predictedQuantitySold,
  };
}

/**
 * Map API prediction result to domain prediction result
 */
export function mapIPredictionResultToPredictionResult(
  result: IPredictionResult
): PredictionResult {
  // Validate required fields
  if (!result.job_id || typeof result.job_id !== "string") {
    throw new Error("Invalid job_id in prediction result");
  }

  if (!result.user_id || typeof result.user_id !== "string") {
    throw new Error("Invalid user_id in prediction result");
  }

  if (!result.status || !isPredictionStatus(result.status)) {
    throw new Error(`Invalid status in prediction result: ${result.status}`);
  }

  // Handle prediction_data - can be array or object
  let predictionData: PredictionItem[] = [];

  if (Array.isArray(result.prediction_data)) {
    predictionData = result.prediction_data.map(
      mapIPredictionItemToPredictionItem
    );
  } else if (
    result.prediction_data &&
    typeof result.prediction_data === "object"
  ) {
    // If it's an object, try to extract an array from it
    // This handles cases where the backend might return { items: [...] } or similar
    const dataObj = result.prediction_data as Record<string, any>;

    // Look for array properties
    const arrayProp = Object.values(dataObj).find((val) => Array.isArray(val));

    if (arrayProp && Array.isArray(arrayProp)) {
      predictionData = arrayProp.map(mapIPredictionItemToPredictionItem);
    } else {
      console.warn(
        "prediction_data is an object but no array found:",
        result.prediction_data
      );
    }
  }

  // Parse dates
  const createdAt = result.created_at ? new Date(result.created_at) : undefined;
  const updatedAt = result.updated_at ? new Date(result.updated_at) : undefined;

  // Validate dates
  if (createdAt && isNaN(createdAt.getTime())) {
    throw new Error(`Invalid created_at date: ${result.created_at}`);
  }

  if (updatedAt && isNaN(updatedAt.getTime())) {
    throw new Error(`Invalid updated_at date: ${result.updated_at}`);
  }

  const mapped: PredictionResult = {
    jobId: result.job_id,
    userId: result.user_id,
    predictionData,
    status: result.status,
    errorMessage: result.error_message || null,
    createdAt,
    updatedAt,
  };

  // Optional id field
  if (result.id !== undefined && result.id !== null) {
    mapped.id = result.id;
  }

  return mapped;
}

/**
 * Map domain prediction result to API prediction result
 */
export function mapPredictionResultToIPredictionResult(
  result: PredictionResult
): IPredictionResult {
  const mapped: IPredictionResult = {
    job_id: result.jobId,
    user_id: result.userId,
    prediction_data: result.predictionData.map(
      mapPredictionItemToIPredictionItem
    ),
    status: result.status,
    error_message: result.errorMessage,
  };

  if (result.id !== undefined) {
    mapped.id = result.id;
  }

  if (result.createdAt) {
    mapped.created_at = result.createdAt.toISOString();
  }

  if (result.updatedAt) {
    mapped.updated_at = result.updatedAt.toISOString();
  }

  return mapped;
}

// ============================================================================
// Exported Mapper Object (Alternative API)
// ============================================================================

export const PredictionMapper = {
  toItem: mapIPredictionItemToPredictionItem,
  fromItem: mapPredictionItemToIPredictionItem,
  toResult: mapIPredictionResultToPredictionResult,
  fromResult: mapPredictionResultToIPredictionResult,
} as const;

export default PredictionMapper;
