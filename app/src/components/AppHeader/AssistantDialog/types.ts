export interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  // Optional fields for assistant messages
  key_points?: string[];
  data_points_referenced?: Record<string, any>;
  cached?: boolean;
  isLoading?: boolean;
}

export interface QuickOption {
  id: string;
  label: string;
  description?: string;
  action: () => void;
}
