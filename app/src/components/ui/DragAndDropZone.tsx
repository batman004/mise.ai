import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { IconUpload } from "@tabler/icons-react";

interface DragAndDropZoneProps {
  onFileDrop: (file: File) => void;
  acceptedFileTypes?: string[];
  children?: React.ReactNode;
  className?: string;
}

export function DragAndDropZone({
  onFileDrop,
  acceptedFileTypes = [".csv", ".xlsx", ".xls"],
  children,
  className,
}: DragAndDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const dragCounterRef = useRef(0);

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    setDragCounter(dragCounterRef.current);
    
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    setDragCounter(dragCounterRef.current);
    
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCounter(0);
    dragCounterRef.current = 0;

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (acceptedFileTypes.includes(fileExtension)) {
        onFileDrop(file);
      } else {
        console.log(`Invalid file type. Please upload ${acceptedFileTypes.join(", ")} files.`);
      }
    }
  };

  useEffect(() => {
    const handleDragEnterBound = (e: DragEvent) => handleDragEnter(e);
    const handleDragLeaveBound = (e: DragEvent) => handleDragLeave(e);
    const handleDragOverBound = (e: DragEvent) => handleDragOver(e);
    const handleDropBound = (e: DragEvent) => handleDrop(e);

    window.addEventListener("dragenter", handleDragEnterBound);
    window.addEventListener("dragleave", handleDragLeaveBound);
    window.addEventListener("dragover", handleDragOverBound);
    window.addEventListener("drop", handleDropBound);

    return () => {
      window.removeEventListener("dragenter", handleDragEnterBound);
      window.removeEventListener("dragleave", handleDragLeaveBound);
      window.removeEventListener("dragover", handleDragOverBound);
      window.removeEventListener("drop", handleDropBound);
    };
  }, [acceptedFileTypes]);

  return (
    <>
      {children}
      {isDragging &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-in fade-in-0 duration-200">
            <div className="bg-white rounded-lg p-8 shadow-lg max-w-md mx-4 text-center animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
              <IconUpload className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">
                Drop your file here
              </h3>
              <p className="text-muted-foreground">
                Upload {acceptedFileTypes.join(", ")} files to import data
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
