import {
  InventoryItemStatus,
  InventoryItemStatusNames,
} from "@/domain/inventory.domain";
import { Badge } from "../ui/badge";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCircleCheck,
  IconPackageImport,
  IconPackageOff,
  IconTrashOff,
} from "@tabler/icons-react";
import type React from "react";

type BadgeVariant = "secondary" | "default" | "destructive" | "outline";

const StatusBadges: {
  [key in InventoryItemStatus]: {
    variant: BadgeVariant;
    className?: string;
    icon?: React.ReactNode;
  };
} = {
  [InventoryItemStatus.GOOD]: {
    variant: "outline",
    icon: <IconCircleCheck />,
    className: "bg-green-200 text-green-700 border border-green-300",
  },
  [InventoryItemStatus.LOW_STOCK]: {
    variant: "default",
    icon: <IconAlertTriangle />,
    className: "bg-yellow-200 text-yellow-700 border border-yellow-300",
  },
  [InventoryItemStatus.CRITICAL]: {
    variant: "default",
    className: "bg-red-200 text-red-700 border border-red-300",
    icon: <IconAlertCircle />,
  },
  [InventoryItemStatus.OUT_OF_STOCK]: {
    variant: "destructive",
    className: "bg-purple-200 text-purple-700 border border-purple-300",
    icon: <IconPackageOff />,
  },
  [InventoryItemStatus.EXPIRED]: {
    variant: "destructive",
    className: "bg-gray-200 text-gray-700 border border-gray-300",
    icon: <IconTrashOff />,
  },
  [InventoryItemStatus.OVERSTOCKED]: {
    variant: "secondary",
    className: "bg-white text-gray-700 border border-gray-300",
    icon: <IconPackageImport />,
  },
};

export function ProductStatusBadge({
  status,
}: {
  status: InventoryItemStatus;
}) {
  const { variant, className, icon } = StatusBadges[status];

  return (
    <Badge variant={variant} className={className}>
      {icon}
      {InventoryItemStatusNames[status]}
    </Badge>
  );
}
