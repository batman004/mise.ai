/**
 * Sales Queries
 *
 * Exports all sales-related React Query hooks.
 */

export { useSalesQuery } from "./getSales";
export type { UseSalesOptions } from "./getSales";

import { useSalesQuery } from "./getSales";

export default {
  useSalesQuery: useSalesQuery,
} as const;
