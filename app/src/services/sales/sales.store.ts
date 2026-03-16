/**
 * Sales Store
 *
 * Zustand store for managing sales state globally.
 * Follows the same pattern as predictions.store.ts
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { Sale, SalesMetrics } from "./sales.domain";

// ============================================================================
// Store State Interface
// ============================================================================

interface SalesState {
  // Data
  sales: Sale[];
  metrics: SalesMetrics | null;
  currentSale: Sale | null; // Currently active/selected sale

  // Loading & Error states
  isLoading: boolean;
  error: Error | string | null;

  // Actions
  setSales: (sales: Sale[]) => void;
  setMetrics: (metrics: SalesMetrics | null) => void;
  setCurrentSale: (sale: Sale | null) => void;
  addSale: (sale: Sale) => void;
  updateSale: (index: number, updates: Partial<Sale>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | string | null) => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  sales: [],
  metrics: null,
  currentSale: null,
  isLoading: false,
  error: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useSalesStore = create<SalesState>()(
  devtools(
    (set) => ({
      ...initialState,

      /**
       * Set all sales
       */
      setSales: (sales) =>
        set({ sales }, false, "setSales"),

      /**
       * Set sales metrics
       */
      setMetrics: (metrics) =>
        set({ metrics }, false, "setMetrics"),

      /**
       * Set the current/active sale
       */
      setCurrentSale: (sale) =>
        set({ currentSale: sale }, false, "setCurrentSale"),

      /**
       * Add a new sale to the store
       * Prepends to the beginning of the array (newest first)
       */
      addSale: (sale) =>
        set(
          (state) => ({
            sales: [sale, ...state.sales],
          }),
          false,
          "addSale"
        ),

      /**
       * Update an existing sale by index
       */
      updateSale: (index, updates) =>
        set(
          (state) => ({
            sales: state.sales.map((sale, i) =>
              i === index ? { ...sale, ...updates } : sale
            ),
            // Also update currentSale if it matches
            currentSale:
              state.currentSale === state.sales[index]
                ? { ...state.currentSale, ...updates }
                : state.currentSale,
          }),
          false,
          "updateSale"
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
      name: "sales-store",
    }
  )
);

// ============================================================================
// Selector Hooks (for convenience)
// ============================================================================

/**
 * Hook to get just the sales array
 */
export const useSales = () =>
  useSalesStore((state) => state.sales);

/**
 * Hook to get the sales metrics
 */
export const useSalesMetrics = () =>
  useSalesStore((state) => state.metrics);

/**
 * Hook to get the current sale
 */
export const useCurrentSale = () =>
  useSalesStore((state) => state.currentSale);

/**
 * Hook to get loading state
 */
export const useSalesLoading = () =>
  useSalesStore((state) => state.isLoading);

/**
 * Hook to get error state
 */
export const useSalesError = () =>
  useSalesStore((state) => state.error);

/**
 * Hook to get all actions
 */
export const useSalesActions = () =>
  useSalesStore((state) => ({
    setSales: state.setSales,
    setMetrics: state.setMetrics,
    setCurrentSale: state.setCurrentSale,
    addSale: state.addSale,
    updateSale: state.updateSale,
    setLoading: state.setLoading,
    setError: state.setError,
    reset: state.reset,
  }));

export default useSalesStore;