/**
 * Report Generation Modal
 *
 * Modal component for generating comprehensive PDF reports.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IconFileText, IconLoader2 } from "@tabler/icons-react";
import { useGenerateReport } from "@/services/reports";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface ReportGenerationModalProps {
  children?: React.ReactNode;
}

export function ReportGenerationModal({
  children,
}: ReportGenerationModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const { user } = useAuth();

  const generateReportMutation = useGenerateReport({
    onSuccess: (data) => {
      toast.success("Report generation started!", {
        description:
          "You will receive the comprehensive PDF report via email shortly.",
      });
      setOpen(false);
      setEmail("");
    },
    onError: (error) => {
      toast.error("Failed to generate report", {
        description: error.message || "Please try again later.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter a valid email address");
      return;
    }

    if (!user?.id) {
      toast.error("User not authenticated");
      return;
    }

    generateReportMutation.mutate({
      user_id: parseInt(user.id),
      email: email.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <IconFileText className="h-4 w-4" />
            Generate Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconFileText className="h-5 w-5" />
            Generate Comprehensive Report
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive PDF report including executive summary, key
            metrics, monthly sales overview, wastage analysis, and AI-generated
            recommendations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={generateReportMutation.isPending}
            />
            <p className="text-sm text-muted-foreground">
              The report will be generated asynchronously and sent to this email
              address.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={generateReportMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generateReportMutation.isPending || !email.trim()}
            >
              {generateReportMutation.isPending ? (
                <>
                  <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                "Generate Report"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
