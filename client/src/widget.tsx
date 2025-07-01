import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatInterface } from "./components/chatbot/chat-interface";

const root = createRoot(document.getElementById("widget-root")!);

root.render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <ChatInterface isOpen={true} onClose={() => {}} />
    </TooltipProvider>
  </QueryClientProvider>
);