import { AppSidebarData } from "@/components/AppSidebar";
import type { DashboardSidebarData } from "@/components/AppSidebar/AppSidebar.data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useLocation } from "@tanstack/react-router";
import { Fragment, useMemo } from "react";

export function NavigationBreadcrumb() {
  const { pathname } = useLocation();

  const breadcrumbs = useMemo(() => {
    const paths = pathname.split("/").slice(1).join("/");

    // Find the titles by going through sidebar data
    const findTitle = (
      path: string,
      nav?: DashboardSidebarData["nav"],
      baseHref?: string,
    ): { label: string; href: string; nav?: DashboardSidebarData["nav"] }[] => {
      const parts = path.split("/");
      const item = nav?.find((item) => item.href === `/${parts[0]}`);

      const bc = item
        ? {
            label: item?.title,
            href: baseHref ? `${baseHref}/${item.href}` : item.href,
            nav: item.items,
          }
        : {
            label: "???",
            href: "#",
          };
      return parts.length === 1
        ? [bc]
        : [bc, ...findTitle(parts.slice(1).join("/"), bc.nav, bc.href)];
    };

    return findTitle(paths, AppSidebarData.nav);
  }, [pathname]);

  return (
    <Breadcrumb className="hidden sm:block">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/" className="capitalize">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        {breadcrumbs.map((breadcrumb, index) =>
          index === breadcrumbs.length - 1 ? (
            <BreadcrumbItem key={index}>
              <BreadcrumbPage className="capitalize">
                {breadcrumb.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          ) : (
            <Fragment key={index}>
              <BreadcrumbItem>
                <BreadcrumbLink href={breadcrumb.href} className="capitalize">
                  {breadcrumb.label}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </Fragment>
          ),
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
