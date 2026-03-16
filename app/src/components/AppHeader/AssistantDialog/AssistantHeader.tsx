import {
  IconTrash,
  IconMenu2,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { QuickOption } from "./types";

interface AssistantHeaderProps {
  messages: any[];
  quickOptions: QuickOption[];
  onClearChat: () => void;
  onToggleExpanded: () => void;
  isExpanded: boolean;
}

export function AssistantHeader({
  messages,
  quickOptions,
  onClearChat,
  onToggleExpanded,
  isExpanded,
}: AssistantHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 pt-2 bg-gradient-to-b from-background/95 to-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="h-8 w-8 p-0"
        >
          {isExpanded ? (
            <IconChevronLeft className="h-4 w-4" />
          ) : (
            <IconChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <IconMenu2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64"
            data-assistant-dropdown="true"
          >
            {quickOptions.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onClick={() => {
                  option.action();
                }}
                className="flex flex-col items-start gap-1 p-3"
              >
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground">
                  {option.description}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                onClick={onClearChat}
                disabled={messages.length === 1}
              >
                <IconTrash className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear chat history</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
