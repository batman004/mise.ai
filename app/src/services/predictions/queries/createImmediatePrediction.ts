/**
 * Create Immediate Prediction Mutation
 *
 * React Query mutation hook for creating high-priority predictions
 * that return results immediately (synchronous).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePredictionRequest,
  IPredictionResponse,
  PredictionResult,
} from "../predictions.domain";
import { formatPredictionDate } from "../predictions.domain";
import { usePredictionsStore } from "../predictions.store";

// ============================================================================
// API Function
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Create an immediate (high-priority) prediction via the API
 * Returns prediction data immediately
 */
async function createImmediatePrediction(
  request: CreatePredictionRequest
): Promise<IPredictionResponse> {
  const formData = new FormData();

  // Format date as YYYY-MM-DD
  const dateStr = formatPredictionDate(request.date);
  formData.append("date", dateStr);

  // Add user_id if provided
  if (request.userId) {
    formData.append("user_id", request.userId);
  }

  const url = `${API_URL}/prediction/wastage/immediate`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create immediate prediction: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  return data as IPredictionResponse;
}

// ============================================================================
// React Query Mutation Hook
// ============================================================================

export interface UseCreateImmediatePredictionOptions {
  onSuccess?: (data: IPredictionResponse, prediction?: PredictionResult) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create an immediate (high-priority) prediction
 * This returns results synchronously and updates the store immediately
 *
 * @param options - Mutation options
 */
export function useCreateImmediatePrediction(
  options?: UseCreateImmediatePredictionOptions
) {
  const queryClient = useQueryClient();
  const { setError, setCurrentPrediction, addPrediction } =
    usePredictionsStore();

  return useMutation({
    mutationFn: createImmediatePrediction,
    onSuccess: (data) => {
      // If we got prediction data back, convert and store it
      if (data.prediction_data && Array.isArray(data.prediction_data)) {
        try {
          // Create a PredictionResult from the response
          const predictionResult: PredictionResult = {
            jobId: data.job_id,
            userId: "default_user", // TODO: Get from context/auth
            predictionData: data.prediction_data.map((item) => ({
              menuItem: item.menu_item,
              predictedQuantitySold: item.predicted_quantity_sold,
              date: new Date(item.date),
              timeOfDay: item.time_of_day,
              specialEvent: item.special_event,
              weatherCondition: item.weather_condition,
              recommendedOrderQty: item.recommended_order_qty,
            })),
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Add to store
          addPrediction(predictionResult);

          // Set as current prediction
          setCurrentPrediction(predictionResult);

          // Invalidate predictions query to keep in sync
          queryClient.invalidateQueries({
            queryKey: ["predictions", "results"],
          });

          // Call custom success handler with both response and result
          options?.onSuccess?.(data, predictionResult);
        } catch (error) {
          console.error("Failed to map prediction result:", error);
          // Still call success handler with just the response
          options?.onSuccess?.(data);
        }
      } else {
        // No data returned, just call success handler
        options?.onSuccess?.(data);
      }
    },
    onError: (error: Error) => {
      setError(error);

      // Call custom error handler if provided
      options?.onError?.(error);
    },
  });
}

export default useCreateImmediatePrediction;
