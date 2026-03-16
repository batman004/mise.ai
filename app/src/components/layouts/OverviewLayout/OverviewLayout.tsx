import { MenuPredictionChart } from "./MenuPredictionChart/MenuPredictionChart";
import { OverviewLayoutLoader } from "./OverviewLayout.loader";
import { MonthlySalesChart } from "./MonthlySalesChart";
import { WeatherWastageChart } from "./WeatherWastageChart";
import { SpecialEventsWastageChart } from "./SpecialEventsWastageChart";
import { WastageTrendsChart } from "./WastageTrendsChart";
import { useSalesQuery } from "@/services/sales";
import { useAuth } from "@/contexts/auth";
import { FileUploadButton } from "@/components/ui/FileUploadButton";
import { DragAndDropZone } from "@/components/ui/DragAndDropZone";
import { FileUploadStatus } from "@/components/ui/FileUploadStatus";
import { ErrorDisplay } from "@/components/ui/ErrorDisplay";
import { HealthStatus } from "@/components/ui/HealthStatus";
import { ReportGenerationModal } from "@/components/ui/ReportGenerationModal";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useState } from "react";

export function OverviewLayout() {
  const { user } = useAuth();
  const { sales, metrics, isLoading, error, refetch } = useSalesQuery({
    userId: parseInt(user?.id || "0"),
    withMetrics: true,
  });

  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const fileUpload = useFileUpload({
    workspace: user?.id || "1",
    label: "overview",
    user_id: user?.id ? String(user.id) : undefined,
    onSuccess: () => {
      setUploadStatus({
        type: "success",
        message: `Successfully imported items`,
      });
      // Refetch sales data to show the newly uploaded data
      refetch();
    },
    onError: (error) => {
      console.error("File upload failed:", error);

      let message = error.message || "Upload failed";

      // Handle CORS errors specifically
      if (error.message?.includes("CORS error")) {
        message =
          "Network error occurred. If the file was uploaded successfully, please refresh the page.";
      }

      setUploadStatus({
        type: "error",
        message,
      });
    },
  });

  const handleFileSelect = (file: File) => {
    // Prevent multiple uploads if one is already in progress
    if (fileUpload.isPending) {
      console.log("Upload already in progress, ignoring duplicate request");
      return;
    }

    console.log("Selected file:", file.name, file.type, file.size);
    fileUpload.mutate(file);
  };

  const handleRetry = () => {
    refetch();
  };

  // Render header section with buttons - always visible
  const renderHeader = () => (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Monitor your restaurant performance metrics
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <HealthStatus />
        <ReportGenerationModal />
        <FileUploadButton
          onFileSelect={handleFileSelect}
          isUploading={fileUpload.isPending}
          variant="outline"
        >
          Upload Data
        </FileUploadButton>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        <OverviewLayoutLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        <ErrorDisplay
          title="Failed to load overview data"
          message={
            error.message ||
            "Unable to fetch sales data and metrics. Please check your connection and try again."
          }
          onRetry={handleRetry}
          isRetrying={isLoading}
        />
      </div>
    );
  }

  // Helper function to check if we have any meaningful data to display
  const hasAnyData = () => {
    return (
      (sales && sales.length > 0) ||
      (metrics &&
        ((metrics.revenueByMonth && metrics.revenueByMonth.length > 0) ||
          metrics.weatherConditionWastage ||
          metrics.wastageTrends ||
          metrics.specialEventWastage))
    );
  };

  // If we have no data at all, show the no data message
  // This handles the case where the API returns successfully but with empty data
  if (!hasAnyData()) {
    return (
      <div className="space-y-6">
        {renderHeader()}
        <ErrorDisplay
          title="No data available"
          message="No sales data or metrics found. Please upload some sales data to get started."
          showRetryButton={false}
        />
      </div>
    );
  }

  return (
    <DragAndDropZone onFileDrop={handleFileSelect}>
      <div className="space-y-6">
        {renderHeader()}

        <FileUploadStatus
          status={uploadStatus}
          onClear={() => setUploadStatus({ type: null, message: "" })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MonthlySalesChart
            className="lg:col-span-2"
            revenue={metrics?.revenueByMonth || []}
          />

          <MenuPredictionChart
            className="lg:col-span-2"
            userId={parseInt(user?.id || "1")}
            sales={sales || []}
          />

          <WeatherWastageChart
            className="lg:col-span-1"
            weatherWastage={metrics?.weatherConditionWastage}
          />

          <WastageTrendsChart
            className="lg:col-span-2"
            wastageTrends={metrics?.wastageTrends}
          />

          <SpecialEventsWastageChart
            className="lg:col-span-1"
            specialEventsWastage={metrics?.specialEventWastage}
          />
        </div>
      </div>
    </DragAndDropZone>
  );
}
