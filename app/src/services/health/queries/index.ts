/**
 * Health Queries
 *
 * Exports all health-related React Query hooks.
 */

export { useHealthCheck } from "./checkHealth";
export type { UseHealthCheckOptions } from "../health.domain";

import { useHealthCheck } from "./checkHealth";

export default {
  useHealthCheck: useHealthCheck,
} as const;
