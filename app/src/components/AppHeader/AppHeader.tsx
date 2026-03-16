"use client";

import { IconLayoutSidebar } from "@tabler/icons-react";

import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AssistantDialog } from "./AssistantDialog";
import { NavigationBreadcrumb } from "./NavigationBreadcrumb";

export function AppHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header
      data-slot="site-header"
      className="bg-background sticky top-0 z-50 flex w-full items-center border-b h-16"
    >
      <div className="flex h-(--header-height) w-full items-center gap-2 px-2 pr-4 justify-between">
        <div className="flex flex-row items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="gap-2.5 has-[>svg]:px-2"
          >
            <IconLayoutSidebar />
          </Button>
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <NavigationBreadcrumb />
        </div>
        <div className="flex flex-row items-center gap-1.5">
          <div className="ml-auto flex items-center gap-2">
            <AssistantDialog />
          </div>
        </div>
      </div>
    </header>
  );
}
