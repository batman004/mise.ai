import { createFileRoute } from "@tanstack/react-router";
import { OverviewLayout } from "@/components/layouts/OverviewLayout";

export const Route = createFileRoute("/")({
  component: OverviewLayout,
});
