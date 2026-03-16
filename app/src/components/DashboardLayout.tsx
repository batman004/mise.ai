import { Outlet } from "@tanstack/react-router";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

export function DashboardLayout() {
  return (
    <main className="[--header-height:calc(theme(spacing.14))]">
      <SidebarProvider className="flex ">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <SidebarInset className="p-4 pt-2 ">
            <Outlet />
          </SidebarInset>
        </div>
      </SidebarProvider>
    </main>
  );
}
