import {
  createRootRoute,
  Outlet,
  useLocation,
  useRouter,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { TanstackDevtools } from "@tanstack/react-devtools";
import { useEffect } from "react";
import { Toaster } from "sonner";

import { AuthProvider } from "../contexts/auth";
import { useAuth } from "../contexts/auth";
import { DashboardLayout } from "@/components/DashboardLayout";

function RootComponent() {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && location.pathname !== "/login") {
      router.navigate({ to: "/login" });
    }
  }, [user, isLoading, location.pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is logged in and not on login page, wrap in DashboardLayout
  if (user && location.pathname !== "/login") {
    return <DashboardLayout />;
  }

  // For login page or when not authenticated, render outlet directly
  return <Outlet />;
}

export const Route = createRootRoute({
  component: () => (
    <AuthProvider>
      <RootComponent />
      <Toaster />
      <TanstackDevtools
        config={{
          position: "bottom-left",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
          {
            name: "Tanstack Query",
            render: <ReactQueryDevtoolsPanel />,
          },
        ]}
      />
    </AuthProvider>
  ),
});
