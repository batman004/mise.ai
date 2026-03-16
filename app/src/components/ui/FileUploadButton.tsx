import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import { IconUpload, IconLoader2 } from "@tabler/icons-react";

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  accept?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function FileUploadButton({
  onFileSelect,
  isUploading = false,
  accept = ".csv,.xlsx,.xls",
  disabled = false,
  children,
  variant = "outline",
  size = "default",
  className,
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
      // Clear the input to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isUploading}
        className={className}
      >
        {isUploading ? (
          <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <IconUpload className="h-4 w-4 mr-2" />
        )}
        {children || (isUploading ? "Uploading..." : "Upload File")}
      </Button>
    </>
  );
}
