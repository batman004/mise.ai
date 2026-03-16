import React, { useEffect } from "react";

interface FileUploadStatusProps {
  status: {
    type: "success" | "error" | null;
    message: string;
  };
  onClear: () => void;
  autoClearDelay?: number;
  className?: string;
}

export function FileUploadStatus({
  status,
  onClear,
  autoClearDelay = 5000,
  className,
}: FileUploadStatusProps) {
  useEffect(() => {
    if (status.type) {
      const timeout = status.type === "error" && status.message.includes("CORS error") 
        ? 8000 
        : autoClearDelay;
      
      const timer = setTimeout(() => {
        onClear();
      }, timeout);

      return () => clearTimeout(timer);
    }
  }, [status.type, status.message, onClear, autoClearDelay]);

  if (!status.type) {
    return null;
  }

  return (
    <div
      className={`p-4 rounded-lg ${
        status.type === "success"
          ? "bg-green-50 text-green-800 border border-green-200"
          : "bg-red-50 text-red-800 border border-red-200"
      } ${className || ""}`}
    >
      {status.message}
    </div>
  );
}
