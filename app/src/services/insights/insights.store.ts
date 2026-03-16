/**
 * Insights Store
 *
 * Zustand store for managing insights state.
 * Follows the same pattern as sales.store.ts and predictions.store.ts
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { FixedInsightsResponse, InsightAnswer } from "./insights.domain";

// ============================================================================
// Store Interface
// ============================================================================

interface InsightsState {
  // Data
  fixedInsights: FixedInsightsResponse | null;
  isLoading: boolean;
  error: Error | string | null;

  // Actions
  setFixedInsights: (insights: FixedInsightsResponse | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | string | null) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  fixedInsights: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useInsightsStore = create<InsightsState>()(
  devtools(
    (set) => ({
      ...initialState,

      /**
       * Set fixed insights data
       */
      setFixedInsights: (insights) =>
        set({ fixedInsights: insights }, false, "setFixedInsights"),

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
      name: "insights-store",
    }
  )
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get all insights answers from the current fixed insights
 */
export const useInsightsAnswers = () =>
  useInsightsStore((state) => state.fixedInsights?.result?.answers || []);

/**
 * Get insights by question ID
 */
export const useInsightsByQuestion = (questionId: string) =>
  useInsightsStore((state) => 
    state.fixedInsights?.result?.answers.find(answer => answer.question === questionId)
  );

/**
 * Get insights status
 */
export const useInsightsStatus = () =>
  useInsightsStore((state) => state.fixedInsights?.status);

/**
 * Check if insights are completed
 */
export const useIsInsightsCompleted = () =>
  useInsightsStore((state) => state.fixedInsights?.status === "completed");

/**
 * Check if insights are loading
 */
export const useIsInsightsLoading = () =>
  useInsightsStore((state) => state.isLoading);

/**
 * Get insights error
 */
export const useInsightsError = () =>
  useInsightsStore((state) => state.error);

export default useInsightsStore;
