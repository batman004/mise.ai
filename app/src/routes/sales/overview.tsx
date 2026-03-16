import { createFileRoute, Link } from "@tanstack/react-router";
import { useFileUpload } from "@/hooks/useFileUpload";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Target,
  Calendar,
  BarChart3
} from "lucide-react";
import {
  IconPlus,
  IconUpload,
  IconLoader2,
  IconChartLine,
  IconReportAnalytics
} from "@tabler/icons-react";
import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";

export const Route = createFileRoute("/sales/overview")({
  component: SalesOverviewPage,
});

function SalesOverviewPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const setDragCounter = useState(0)[1];
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const fileUpload = useFileUpload({
    workspace: "1",
    label: "sales",
    onSuccess: (data) => {
      setUploadStatus({
        type: "success",
        message: `Successfully imported ${data.importedCount || 0} sales records`,
      });
      setTimeout(() => setUploadStatus({ type: null, message: "" }), 5000);
    },
    onError: (error) => {
      console.error("File upload failed:", error);

      let message = error.message || "Upload failed";

      if (error.message?.includes("CORS error")) {
        message =
          "Network error occurred. If the file was uploaded successfully, please refresh the page.";
      }

      setUploadStatus({
        type: "error",
        message,
      });
      const timeout = error.message?.includes("CORS error") ? 8000 : 5000;
      setTimeout(() => setUploadStatus({ type: null, message: "" }), timeout);
    },
  });

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const processFile = (file: File) => {
    if (fileUpload.isPending) {
      console.log("Upload already in progress, ignoring duplicate request");
      return;
    }

    console.log("Selected file:", file.name, file.type, file.size);
    fileUpload.mutate(file);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    setDragCounter((prev) => {
      const newCount = prev + 1;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
      return newCount;
    });
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCounter(0);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const allowedTypes = [".csv", ".xlsx", ".xls"];
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();

      if (allowedTypes.includes(fileExtension)) {
        processFile(file);
      } else {
        console.log("Invalid file type. Please upload CSV or Excel files.");
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
  }, []);

  // Mock sales data - replace with real data from your API
  const salesMetrics = {
    totalRevenue: 48750,
    revenueGrowth: 12.5,
    totalOrders: 324,
    ordersGrowth: 8.2,
    avgOrderValue: 150.46,
    avgOrderGrowth: 4.1,
    customersServed: 198,
    customerGrowth: -2.3,
  };

  return (
    <div className="space-y-6">
      {isDragging &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center animate-in fade-in-0 duration-200">
            <div className="bg-white rounded-lg p-8 shadow-lg max-w-md mx-4 text-center animate-in zoom-in-95 slide-in-from-bottom-2 duration-300">
              <IconUpload className="h-12 w-12 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-semibold mb-2">
                Drop your sales file here
              </h3>
              <p className="text-muted-foreground">
                Upload CSV or Excel files to import sales data
              </p>
            </div>
          </div>,
          document.body,
        )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Overview</h1>
          <p className="text-muted-foreground">
            Monitor sales performance and upload sales data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />
          <Button variant="secondary" onClick={handleFileUpload} disabled={fileUpload.isPending}>
            {fileUpload.isPending ? (
              <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <IconUpload className="h-4 w-4 mr-2" />
            )}
            {fileUpload.isPending ? "Uploading..." : "Upload Sales Data"}
          </Button>
          <Link to="/sales/planning">
            <Button>
              <IconChartLine className="h-4 w-4 mr-2" />
              View Planning
            </Button>
          </Link>
        </div>
      </div>

      {uploadStatus.type && (
        <div
          className={`p-4 rounded-lg ${
            uploadStatus.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {uploadStatus.message}
        </div>
      )}

      {/* Sales Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salesMetrics.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{salesMetrics.revenueGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesMetrics.totalOrders}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{salesMetrics.ordersGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${salesMetrics.avgOrderValue.toFixed(2)}</div>
            <div className="flex items-center text-xs text-green-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{salesMetrics.avgOrderGrowth}% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers Served</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesMetrics.customersServed}</div>
            <div className="flex items-center text-xs text-red-600">
              <TrendingDown className="h-3 w-3 mr-1" />
              {salesMetrics.customerGrowth}% from last month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconReportAnalytics className="h-5 w-5" />
              Sales Analytics
            </CardTitle>
            <CardDescription>
              Detailed analysis of sales trends and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              View Analytics
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Sales Planning
            </CardTitle>
            <CardDescription>
              Forecasts and predictions for future sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/sales/planning">
              <Button variant="outline" className="w-full">
                Open Planning
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Reports
            </CardTitle>
            <CardDescription>
              Generate and export sales performance reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
