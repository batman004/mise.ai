/**
 * Health Service
 *
 * Main entry point for the health service.
 * Exports all health-related functionality.
 */

// Domain exports
export * from "./health.domain";

// Query exports
export * from "./queries";

// Default exports for convenience
export { default as useHealthCheck } from "./queries/checkHealth";
