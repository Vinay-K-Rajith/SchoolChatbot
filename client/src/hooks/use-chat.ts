import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { nanoid } from "nanoid";
import type { ChatMessage } from "@shared/schema";

interface ChatResponse {
  userMessage: ChatMessage;
  aiMessage: ChatMessage;
}

export function useChat() {
  const [sessionId, setSessionId] = useState<string>("");
  const queryClient = useQueryClient();
  const schoolCode = "SXSBT"; // TODO: Make dynamic if needed

  // Create session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        const response = await apiRequest("POST", "/api/chat/session");
        const data = await response.json();
        setSessionId(data.sessionId);
      } catch (error) {
        console.error("Failed to create chat session:", error);
        // Fallback to client-side session ID
        setSessionId(nanoid());
      }
    };

    initSession();
  }, []);

  // Get chat history
  const { data: historyData } = useQuery({
    queryKey: ["/api/chat/history", sessionId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/chat/history/${sessionId}`);
      return response.json();
    },
    enabled: !!sessionId,
  });

  const messages: ChatMessage[] = historyData?.messages || [];

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, schoolCode }: { content: string; schoolCode: string }) => {
      const response = await apiRequest("POST", "/api/chat/message", {
        sessionId,
        content,
        schoolCode,
      });
      return response.json() as Promise<ChatResponse>;
    },
    onSuccess: (data) => {
      // Update the cache directly with the new messages
      queryClient.setQueryData(["/api/chat/history", sessionId], (oldData: any) => {
        const currentMessages = oldData?.messages || [];
        return {
          messages: [...currentMessages, data.userMessage, data.aiMessage]
        };
      });
    },
  });

  const sendMessage = async (content: string, codeOverride?: string) => {
    if (!sessionId || !content.trim()) return;
    try {
      await sendMessageMutation.mutateAsync({ content, schoolCode: codeOverride || schoolCode });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return {
    sessionId,
    messages,
    sendMessage,
    isLoading: sendMessageMutation.isPending,
  };
}
