/**
 * Question Queries
 *
 * Exports all question-related React Query hooks.
 */

export { useAskQuestion } from "./askQuestion";
export type { UseAskQuestionOptions } from "../question.domain";

import { useAskQuestion } from "./askQuestion";

export default {
  useAskQuestion: useAskQuestion,
} as const;
