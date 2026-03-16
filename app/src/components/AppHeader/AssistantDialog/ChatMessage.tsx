import { cn } from "@/lib/utils";
import { IconLoader2, IconCheck } from "@tabler/icons-react";
import type { Message } from "./types";

export function ChatMessage({ message }: { message: Message }) {
  return (
    <div
      className={cn(
        "flex",
        message.type === "user" ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "rounded-lg px-3 py-2 max-w-[80%] text-sm",
          message.type === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <IconLoader2 className="h-3 w-3 animate-spin" />
            <span>Thinking...</span>
          </div>
        ) : (
          <>
            <div className="whitespace-pre-wrap">{message.content}</div>

            {/* Show key points if available */}
            {message.key_points && message.key_points.length > 0 && (
              <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                <div className="text-xs font-bold mb-1">Key Points:</div>
                <ul className="text-xs space-y-1">
                  {message.key_points.map((point, index) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-muted-foreground">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Show data points referenced if available */}
            {message.data_points_referenced &&
              Object.keys(message.data_points_referenced).length > 0 && (
                <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                  <div className="text-xs font-bold mb-1">
                    Data Points Referenced:
                  </div>
                  <div className="text-xs space-y-1">
                    {Object.entries(message.data_points_referenced).map(
                      ([key, value], index) => (
                        <div key={index} className="flex flex-col gap-1">
                          <div className="font-bold">{key}:</div>
                          <div className="text-muted-foreground ml-2">
                            {typeof value === "object"
                              ? JSON.stringify(value)
                              : String(value)}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Show cache indicator */}
            {message.cached && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <IconCheck className="h-3 w-3" />
                <span>Cached response</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
