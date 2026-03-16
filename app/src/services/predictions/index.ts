/**
 * Predictions Service
 *
 * Main entry point for the predictions service.
 * Exports all domain types, store, mappers, and query hooks.
 */

// Domain types and helpers
export * from "./predictions.domain";

// Mapper functions
export * from "./predictions.mapper";

// Zustand store
export * from "./predictions.store";

// Query hooks
export * from "./queries/getPredictionResults";
export * from "./queries/createPrediction";
export * from "./queries/createImmediatePrediction";

// Utility functions
export * from "./predictions.utils";
