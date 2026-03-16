/**
 * Fixed Insights Card Component
 *
 * Displays a single insight answer with summary, insights, and recommendations.
 */

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import type { InsightAnswer } from "@/services/insights";

interface FixedInsightsCardProps {
  insight: InsightAnswer;
  className?: string;
}

export function FixedInsightsCard({
  insight,
  className,
}: FixedInsightsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="size-10 text-yellow-500" />
          {insight.questionText}
        </CardTitle>
        <CardDescription>
          AI-generated insights based on your restaurant data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary - Always visible */}
        <div>
          <h4 className="font-semibold text-sm text-muted-foreground mb-2">
            Summary
          </h4>
          <p className="text-sm leading-relaxed">{insight.answer.summary}</p>
        </div>

        {/* Accordion for detailed sections */}
        <Accordion type="multiple" className="w-full">
          {/* Key Insights */}
          {insight.answer.insights.length > 0 && (
            <AccordionItem value="insights">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Key Insights ({insight.answer.insights.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {insight.answer.insights.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <h5 className="font-medium text-sm mb-1">{item.title}</h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        {item.description}
                      </p>
                      {Object.keys(item.metrics).length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(item.metrics).map(([key, value]) => (
                            <Badge
                              key={key}
                              variant="secondary"
                              className="text-xs"
                            >
                              {key}: {value}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Recommendations */}
          {insight.answer.recommendations.length > 0 && (
            <AccordionItem value="recommendations">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Recommendations ({insight.answer.recommendations.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {insight.answer.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <h5 className="font-medium text-sm mb-1">{rec.title}</h5>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rec.description}
                      </p>
                      <div className="text-xs text-green-700 font-medium">
                        Expected Impact: {rec.expectedImpact}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Data Limitations */}
          {insight.answer.dataLimitations.length > 0 && (
            <AccordionItem value="limitations">
              <AccordionTrigger className="text-sm font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Data Limitations ({insight.answer.dataLimitations.length})
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {insight.answer.dataLimitations.map((limitation, index) => (
                    <div
                      key={index}
                      className="text-sm text-amber-700 bg-amber-50 p-2 rounded border border-amber-200"
                    >
                      {limitation}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
