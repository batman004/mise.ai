/**
 * Sales Service
 *
 * Main entry point for the sales service.
 * Exports all sales-related functionality.
 */

// Domain exports
export * from "./sales.domain";

// Mapper exports
export * from "./sales.mapper";

// Store exports
export * from "./sales.store";

// Utils exports
export * from "./sales.utils";

// Query exports
export * from "./queries";

// Default exports for convenience
export { default as SalesMapper } from "./sales.mapper";
export { default as useSalesStore } from "./sales.store";
export { default as useSalesQuery } from "./queries/getSales";
