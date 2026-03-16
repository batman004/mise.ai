import { Card, CardContent } from "@/components/ui/card";
import { ChatMessages } from "./ChatMessages";
import { AssistantHeader } from "./AssistantHeader";
import type { Message, QuickOption } from "./types";

interface AssistantDropdownProps {
  messages: Message[];
  quickOptions: QuickOption[];
  onClearChat: () => void;
  onToggleExpanded: () => void;
  isExpanded: boolean;
}

export function AssistantDropdown({
  messages,
  quickOptions,
  onClearChat,
  onToggleExpanded,
  isExpanded,
}: AssistantDropdownProps) {
  return (
    <Card
      className={`absolute right-0 top-full shadow-lg border-1 rounded-lg z-50 gap-0 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 p-0 ${
        isExpanded ? "w-[64rem]" : "w-144"
      } h-[32rem]`}
    >
      <AssistantHeader
        messages={messages}
        quickOptions={quickOptions}
        onClearChat={onClearChat}
        onToggleExpanded={onToggleExpanded}
        isExpanded={isExpanded}
      />
      <CardContent className="p-0 h-full overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          <ChatMessages messages={messages} />
        </div>
      </CardContent>
    </Card>
  );
}
