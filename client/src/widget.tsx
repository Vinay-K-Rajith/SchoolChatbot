import './index.css';
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ChatInterface } from "./components/chatbot/chat-interface";

function FloatingChatWidget({ schoolCode, shadowRoot }: { schoolCode: string; shadowRoot: ShadowRoot }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          borderRadius: '50%',
          width: 64,
          height: 64,
          background: '#2563eb',
          color: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          fontSize: 32,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Open chat"
        onClick={() => setOpen(true)}
      >
        💬
      </button>
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 100,
            right: 24,
            zIndex: 10000,
            width: 400,
            maxWidth: '95vw',
            height: 600,
            background: 'white',
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end', background: '#f3f8fd', padding: 8 }}>
            <button
              style={{
                background: 'none',
                border: 'none',
                fontSize: 22,
                color: '#2563eb',
                cursor: 'pointer',
              }}
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatInterface isOpen={true} onClose={() => setOpen(false)} schoolCode={schoolCode} />
          </div>
        </div>
      )}
    </>
  );
}

declare global {
  interface Window {
    initSchoolChatWidget: (opts: { schoolCode: string; containerId?: string; cssUrl?: string }) => void;
  }
}

// Helper to inject CSS into shadow root
function injectCSS(shadowRoot: ShadowRoot, cssUrl?: string) {
  if (cssUrl) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    shadowRoot.appendChild(link);
  } else {
    // Optionally, inline fallback CSS here
  }
}

// Export a global function for embeddable usage
window.initSchoolChatWidget = function({ schoolCode, containerId = "widget-root", cssUrl = "/static/chat-widget.css" }: { schoolCode: string; containerId?: string; cssUrl?: string }) {
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.body.appendChild(container);
  }
  // Attach shadow root
  let shadowRoot = (container.shadowRoot as ShadowRoot) || container.attachShadow({ mode: 'open' });
  // Clean shadow root
  while (shadowRoot.firstChild) shadowRoot.removeChild(shadowRoot.firstChild);
  // Inject CSS
  injectCSS(shadowRoot, cssUrl);
  // Create a mount point for React
  const reactRoot = document.createElement('div');
  shadowRoot.appendChild(reactRoot);
  // Render React app
  createRoot(reactRoot).render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <FloatingChatWidget schoolCode={schoolCode} shadowRoot={shadowRoot} />
      </TooltipProvider>
    </QueryClientProvider>
  );
};