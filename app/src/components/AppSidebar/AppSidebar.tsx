"use client";

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
} from "@/components/ui/sidebar";
import SidebarData from "./AppSidebar.data";
import { Link } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import type React from "react";
import { UserButton } from "./UserButton";
import { AppLogo } from "./AppLogo";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex flex-col justify-center h-16">
        <UserButton />
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarMenu className="gap-1.5 pt-1.5">
          {SidebarData.nav.map((item, index) =>
            item.type === "menu" ? (
              <div key={index}>
                <Separator />
                <SidebarGroup className="pt-0 pb-0">
                  <SidebarGroupLabel className="group-data-[collapsible=icon]:pointer-events-none">
                    {item.title}
                  </SidebarGroupLabel>
                  <SidebarGroupContent className="flex flex-col gap-2">
                    <SidebarMenu>
                      {item.items?.map((subitem, index) => (
                        <SidebarMenuItem key={index}>
                          <SidebarMenuButton asChild>
                            <Link to={`${item.href}${subitem.href}`}>
                              {subitem.icon && <subitem.icon />}
                              <span>{subitem.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </div>
            ) : (
              <SidebarMenuItem key={index} className="p-2 pt-0 pb-0">
                <SidebarMenuButton asChild>
                  <Link to={`${item.href}`}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ),
          )}
        </SidebarMenu>
      </SidebarContent>
      <Separator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2 flex-row text-muted-foreground justify-between">
            <div className="flex flex-row gap-2 items-center">
              <AppLogo className="size-6" />
              <span className="text-sm">Mise</span>
            </div>
            <span className="text-sm">v1.0.0</span>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
