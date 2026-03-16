/**
 * Question Service
 *
 * Main entry point for the question service.
 * Exports all question-related functionality.
 */

// Domain exports
export * from "./question.domain";

// Query exports
export * from "./queries";

// Default exports for convenience
export { default as useAskQuestion } from "./queries/askQuestion";
