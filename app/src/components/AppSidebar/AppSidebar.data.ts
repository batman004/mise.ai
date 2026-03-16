import {
  IconLayoutDashboard,
  IconSettings,
  IconSparkles,
} from "@tabler/icons-react";

const data: DashboardSidebarData = {
  nav: [
    {
      title: "Overview",
      href: "/",
      icon: IconLayoutDashboard,
    },
    {
      type: "menu",
      title: "Personal",
      href: "/personal",
      items: [
        {
          title: "Insights",
          href: "/insights",
          icon: IconSparkles,
        },
        {
          title: "Settings",
          href: "/settings",
          icon: IconSettings,
        },
      ],
    },
  ],
};

export default data;

export type DashboardSidebarData = {
  nav: Array<{
    title: string;
    href: string;
    icon?: SidebarIcon;
    type?: "menu";
    items?: Array<{
      title: string;
      href: string;
      icon?: SidebarIcon;
    }>;
  }>;
};

type SidebarIcon = typeof IconLayoutDashboard;
