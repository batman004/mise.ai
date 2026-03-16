import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { QuickActionButton } from "./QuickActionButton";
import type { QuickOption } from "./types";

interface QuickActionsMenuProps {
  options: QuickOption[];
  hasUsedQuickAction: boolean;
  accordionValue: string;
  onAccordionChange: (value: string) => void;
}

export function QuickActionsMenu({
  options,
  hasUsedQuickAction,
  accordionValue,
  onAccordionChange,
}: QuickActionsMenuProps) {
  return (
    <Accordion
      type="single"
      collapsible
      value={accordionValue}
      onValueChange={onAccordionChange}
      className="border-t"
    >
      <AccordionItem value="quick-actions" className="border-none">
        <AccordionTrigger className="py-3 px-0 hover:no-underline">
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground font-medium">
              Quick actions
            </div>
            {hasUsedQuickAction && (
              <div className="text-xs text-muted-foreground/60">
                ({options.length} available)
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="grid gap-2">
            {options.map((option) => (
              <QuickActionButton key={option.id} option={option} />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
