/**
 * Predictions Store
 *
 * Zustand store for managing prediction state globally.
 * Follows the same pattern as sales.store.ts
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { PredictionResult } from "./predictions.domain";

// ============================================================================
// Store State Interface
// ============================================================================

interface PredictionsState {
  // Data
  predictions: PredictionResult[];
  currentPrediction: PredictionResult | null; // Currently active/selected prediction

  // Loading & Error states
  isLoading: boolean;
  error: Error | string | null;

  // Actions
  setPredictions: (predictions: PredictionResult[]) => void;
  setCurrentPrediction: (prediction: PredictionResult | null) => void;
  addPrediction: (prediction: PredictionResult) => void;
  updatePrediction: (jobId: string, updates: Partial<PredictionResult>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | string | null) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  predictions: [],
  currentPrediction: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const usePredictionsStore = create<PredictionsState>()(
  devtools(
    (set) => ({
      ...initialState,

      /**
       * Set all predictions
       */
      setPredictions: (predictions) =>
        set({ predictions }, false, "setPredictions"),

      /**
       * Set the current/active prediction
       */
      setCurrentPrediction: (prediction) =>
        set({ currentPrediction: prediction }, false, "setCurrentPrediction"),

      /**
       * Add a new prediction to the store
       * Prepends to the beginning of the array (newest first)
       */
      addPrediction: (prediction) =>
        set(
          (state) => ({
            predictions: [prediction, ...state.predictions],
          }),
          false,
          "addPrediction"
        ),

      /**
       * Update an existing prediction by job_id
       */
      updatePrediction: (jobId, updates) =>
        set(
          (state) => ({
            predictions: state.predictions.map((p) =>
              p.jobId === jobId ? { ...p, ...updates } : p
            ),
            // Also update currentPrediction if it matches
            currentPrediction:
              state.currentPrediction?.jobId === jobId
                ? { ...state.currentPrediction, ...updates }
                : state.currentPrediction,
          }),
          false,
          "updatePrediction"
        ),

      /**
       * Set loading state
       */
      setLoading: (isLoading) => set({ isLoading }, false, "setLoading"),

      /**
       * Set error state
       */
      setError: (error) => set({ error }, false, "setError"),

      /**
       * Reset store to initial state
       */
      reset: () => set(initialState, false, "reset"),
    }),
    {
      name: "predictions-store",
    }
  )
);

// ============================================================================
// Selector Hooks (for convenience)
// ============================================================================

/**
 * Hook to get just the predictions array
 */
export const usePredictions = () =>
  usePredictionsStore((state) => state.predictions);

/**
 * Hook to get the current prediction
 */
export const useCurrentPrediction = () =>
  usePredictionsStore((state) => state.currentPrediction);

/**
 * Hook to get loading state
 */
export const usePredictionsLoading = () =>
  usePredictionsStore((state) => state.isLoading);

/**
 * Hook to get error state
 */
export const usePredictionsError = () =>
  usePredictionsStore((state) => state.error);

/**
 * Hook to get all actions
 */
export const usePredictionsActions = () =>
  usePredictionsStore((state) => ({
    setPredictions: state.setPredictions,
    setCurrentPrediction: state.setCurrentPrediction,
    addPrediction: state.addPrediction,
    updatePrediction: state.updatePrediction,
    setLoading: state.setLoading,
    setError: state.setError,
    reset: state.reset,
  }));

export default usePredictionsStore;
