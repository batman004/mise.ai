import { IconSearch, IconSparkles } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type React from "react";

interface AssistantInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  isOpen: boolean;
  isExpanded: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

export function AssistantInput({
  value,
  onChange,
  onKeyDown,
  onFocus,
  isOpen,
  isExpanded,
  inputRef,
}: AssistantInputProps) {
  return (
    <div
      className={cn(
        "relative transition-[width] duration-200 ease-in-out",
        isExpanded ? "w-[64rem]" : isOpen ? "w-144" : "w-80"
      )}
    >
      <IconSearch className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        placeholder="Ask assistant about..."
        className="pl-8 pr-8 h-10 w-full"
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
      />
      <IconSparkles
        className={cn(
          "absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300 pointer-events-none z-10",
          isOpen ? "text-primary" : "text-muted-foreground"
        )}
      />
    </div>
  );
}
