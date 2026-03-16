import React, { useState, useRef, useEffect } from "react";
import { AssistantInput } from "./AssistantInput";
import { AssistantDropdown } from "./AssistantDropdown";
import { useAskQuestion } from "@/services/question";
import { useAuth } from "@/contexts/auth";
import type { Message, QuickOption } from "./types";

export function AssistantDialog() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      type: "assistant",
      content: "Hello! How can I help you today?",
    },
  ]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Question API mutation
  const askQuestion = useAskQuestion({
    onSuccess: (data) => {
      // Update the loading message with the actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === "loading"
            ? {
                id: `response-${Date.now()}`,
                type: "assistant" as const,
                content: data.answer,
                key_points: data.key_points,
                data_points_referenced: data.data_points_referenced,
                cached: data.cached,
              }
            : msg
        )
      );
    },
    onError: (error) => {
      // Update the loading message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === "loading"
            ? {
                id: `error-${Date.now()}`,
                type: "assistant" as const,
                content: `Sorry, I encountered an error: ${error.message}`,
              }
            : msg
        )
      );
    },
  });

  // Quick action options
  const quickOptions: QuickOption[] = [
    {
      id: "wastage-summary",
      label: "Show wastage summary",
      description: "Get an overview of current wastage metrics",
      action: () => handleQuickAction("Show me a wastage summary"),
    },
    {
      id: "sales-trends",
      label: "Analyze sales trends",
      description: "View recent sales patterns and insights",
      action: () => handleQuickAction("Analyze sales trends"),
    },
    {
      id: "weather-impact",
      label: "Weather impact analysis",
      description: "See how weather affects wastage",
      action: () => handleQuickAction("Show weather impact on wastage"),
    },
    {
      id: "recommendations",
      label: "Get recommendations",
      description: "Receive AI-powered suggestions to reduce wastage",
      action: () => handleQuickAction("What recommendations do you have?"),
    },
  ];

  const handleSendMessage = (message: string) => {
    if (!message.trim() || !user?.id) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: "user",
      content: message.trim(),
    };

    // Add loading message
    const loadingMessage: Message = {
      id: "loading",
      type: "assistant",
      content: "",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);

    // Ask the question via API
    askQuestion.mutate({
      question: message.trim(),
      user_id: parseInt(user.id),
    });

    setInputValue("");
  };

  const handleQuickAction = (message: string) => {
    handleSendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        type: "assistant",
        content: "Hello! How can I help you today?",
      },
    ]);
  };

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        // Check if the click is on a dropdown menu that's part of our assistant
        const target = event.target as Element;
        const isAssistantDropdownClick = target.closest(
          '[data-assistant-dropdown="true"]'
        );

        if (!isAssistantDropdownClick) {
          setIsOpen(false);
          if (isExpanded) {
            setIsExpanded(false);
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    } else if (isExpanded) {
      setIsExpanded(false);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <AssistantInput
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        isOpen={isOpen}
        isExpanded={isExpanded}
        inputRef={inputRef as React.RefObject<HTMLInputElement>}
      />
      <div className="relative pt-2" ref={containerRef}>
        {isOpen && (
          <AssistantDropdown
            messages={messages}
            quickOptions={quickOptions}
            onClearChat={handleClearChat}
            onToggleExpanded={handleToggleExpanded}
            isExpanded={isExpanded}
          />
        )}
      </div>
    </div>
  );
}
