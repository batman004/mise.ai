/**
 * Create Prediction Mutation
 *
 * React Query mutation hook for creating new predictions.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CreatePredictionRequest,
  IPredictionResponse,
} from "../predictions.domain";
import { PredictionPriority, formatPredictionDate } from "../predictions.domain";
import { usePredictionsStore } from "../predictions.store";

// ============================================================================
// API Function
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Create a new prediction via the API
 */
async function createPrediction(
  request: CreatePredictionRequest
): Promise<IPredictionResponse> {
  const formData = new FormData();

  // Format date as YYYY-MM-DD
  const dateStr = formatPredictionDate(request.date);
  formData.append("date", dateStr);

  // Add priority (default to low if not specified)
  const priority = request.priority || PredictionPriority.LOW;
  formData.append("priority", priority);

  // Add user_id if provided
  if (request.userId) {
    formData.append("user_id", request.userId);
  }

  const url = `${API_URL}/prediction/wastage`;

  const response = await fetch(url, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create prediction: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();
  return data as IPredictionResponse;
}

// ============================================================================
// React Query Mutation Hook
// ============================================================================

export interface UseCreatePredictionOptions {
  onSuccess?: (data: IPredictionResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook to create a new prediction
 *
 * @param options - Mutation options
 */
export function useCreatePrediction(options?: UseCreatePredictionOptions) {
  const queryClient = useQueryClient();
  const { setError } = usePredictionsStore();

  return useMutation({
    mutationFn: createPrediction,
    onSuccess: (data) => {
      // Invalidate predictions query to refetch
      queryClient.invalidateQueries({
        queryKey: ["predictions", "results"],
      });

      // Call custom success handler if provided
      options?.onSuccess?.(data);
    },
    onError: (error: Error) => {
      setError(error);

      // Call custom error handler if provided
      options?.onError?.(error);
    },
  });
}

export default useCreatePrediction;
