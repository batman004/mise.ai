/**
 * Health Status Component
 *
 * Displays system health status with hover dropdown for additional details.
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  IconPackage,
  IconChevronDown,
  IconCheck,
  IconX,
  IconAlertCircle,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useHealthCheck } from "@/services/health";
import type { HealthResponse } from "@/services/health";

interface HealthStatusProps {
  className?: string;
}

export function HealthStatus({ className }: HealthStatusProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { data: health, isLoading, error } = useHealthCheck();

  const getStatusInfo = (health: HealthResponse | undefined) => {
    if (!health) {
      return {
        status: "unknown",
        color: "bg-gray-50",
        textColor: "text-gray-600",
        icon: IconAlertCircle,
        label: "Unknown",
      };
    }

    if (health.status === "healthy") {
      // Check if any services are unhealthy
      const hasUnhealthyServices =
        health.services &&
        Object.values(health.services).some((status) => status === "unhealthy");

      if (hasUnhealthyServices) {
        return {
          status: "degraded",
          color: "bg-yellow-50",
          textColor: "text-yellow-600",
          icon: IconAlertCircle,
          label: "System Degraded",
        };
      }

      return {
        status: "healthy",
        color: "bg-green-50",
        textColor: "text-green-600",
        icon: IconCheck,
        label: "System Healthy",
      };
    } else {
      return {
        status: "unhealthy",
        color: "bg-red-50",
        textColor: "text-red-600",
        icon: IconX,
        label: "System Unhealthy",
      };
    }
  };

  const statusInfo = getStatusInfo(health);
  const StatusIcon = statusInfo.icon;

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleString();
    } catch {
      return "Unknown";
    }
  };

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Badge
        variant="outline"
        className={cn(statusInfo.color, statusInfo.textColor)}
      >
        <IconPackage className="h-3 w-3 mr-1" />
        {isLoading ? "Checking..." : statusInfo.label}
        <IconChevronDown className="h-3 w-3 ml-1" />
      </Badge>

      {/* Hover Dropdown */}
      {isHovered && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">System Health</h3>
              <StatusIcon className={cn("h-4 w-4", statusInfo.textColor)} />
            </div>

            {isLoading ? (
              <div className="text-sm text-gray-600">
                Checking system status...
              </div>
            ) : error ? (
              <div className="text-sm text-red-600">
                Failed to check health: {error.message}
              </div>
            ) : health ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Overall Status:</span>
                    <span className={cn("font-medium", statusInfo.textColor)}>
                      {statusInfo.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Checked:</span>
                    <span className="text-gray-800">
                      {formatTimestamp(health.timestamp)}
                    </span>
                  </div>
                </div>

                {health.services && (
                  <div className="border-t pt-3">
                    <h4 className="font-medium text-sm mb-2">Services</h4>
                    <div className="space-y-2">
                      {Object.entries(health.services).map(
                        ([service, status]) => (
                          <div
                            key={service}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-gray-600 capitalize">
                              {service}:
                            </span>
                            <div className="flex items-center gap-1">
                              {status === "healthy" ? (
                                <IconCheck className="h-3 w-3 text-green-500" />
                              ) : (
                                <IconX className="h-3 w-3 text-red-500" />
                              )}
                              <span
                                className={cn(
                                  "font-medium",
                                  status === "healthy"
                                    ? "text-green-600"
                                    : "text-red-600"
                                )}
                              >
                                {status.toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {health.error && (
                  <div className="border-t pt-3">
                    <h4 className="font-medium text-sm mb-2 text-red-600">
                      Error Details
                    </h4>
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {health.error}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-600">
                No health data available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
