import { Button } from "@/components/ui/button";
import type { QuickOption } from "./types";

export function QuickActionButton({ option }: { option: QuickOption }) {
  return (
    <Button
      variant="outline"
      className="justify-start h-auto py-2 px-3 text-left"
      onClick={option.action}
    >
      <div className="flex flex-col items-start gap-0.5">
        <div className="text-sm font-medium">{option.label}</div>
        {option.description && (
          <div className="text-xs text-muted-foreground font-normal">
            {option.description}
          </div>
        )}
      </div>
    </Button>
  );
}
