import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "./message-bubble";
import { QuickActions } from "./quick-actions";
import { TypingIndicator } from "./typing-indicator";
import { useChat } from "@/hooks/use-chat";
import { Select } from "@/components/ui/select";

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  schoolCode: string;
}

export function ChatInterface({ isOpen, onClose, schoolCode }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const { messages, sendMessage, isLoading, sessionId } = useChat(schoolCode);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const [school, setSchool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<{ url: string; alt: string }[]>([]);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/school/${schoolCode}`)
      .then(res => res.json())
      .then(data => {
        setSchool(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Fetch images for the school
    fetch(`/api/school/${schoolCode}/images`)
      .then(res => res.json())
      .then(data => setImages(data.images || []))
      .catch(() => setImages([]));
    // Fetch image keywords once
    fetch(`/api/school/${schoolCode}/image-keywords`)
      .then(res => res.json())
      .then(data => setAvailableKeywords(data.keywords || []))
      .catch(() => setAvailableKeywords([]));
  }, [schoolCode]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ block: "start" });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    await sendMessage(message, schoolCode);
    setMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (query: string) => {
    sendMessage(query, schoolCode);
  };

  if (!isOpen) return null;
  if (loading) return <div className="flex items-center justify-center h-full">Loading school info...</div>;
  if (!school) return <div className="flex items-center justify-center h-full">School info not found.</div>;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end"
      onClick={onClose}
    >
      <div
        className="w-full md:w-[606px] max-w-[98vw] h-[calc(98vh-58px)] md:h-[calc(48rem-58px)] bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col animate-slide-up overflow-hidden m-2 md:m-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Quick Actions (top, no label) */}
        <div className="px-6 pt-5 pb-4 bg-blue-50 border-b border-blue-100">
          <div className="bg-white border border-blue-100 rounded-xl p-4 flex flex-col gap-3 shadow-sm">
            <QuickActions onQuickAction={handleQuickAction} />
          </div>
        </div>
        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-6 py-6 bg-gray-50" ref={scrollAreaRef}>
          <div className="space-y-5 pb-4">
            {/* Welcome Message */}
            <MessageBubble
              content={`Hello! 👋 I'm your assistant for ${school.school?.name || "the school"}. I can help you with:\n\n**Admissions Information**\n• Age eligibility for Nursery & LKG\n• Required documents and procedures\n• Selection process and priorities\n\n**Fee Structure & Payments**\n• Registration fees and payment methods\n• Fee rules and refund policies\n\n**School Policies**\n• Academic programs and grading\n• Rules and regulations\n\nHow can I assist you today?`}
              isUser={false}
              timestamp={new Date()}
              schoolCode={schoolCode}
              availableKeywords={availableKeywords}
            />
            {messages.map((msg, idx) => (
              <div
                key={msg.id}
                ref={idx === messages.length - 1 ? lastMessageRef : undefined}
              >
                <MessageBubble
                  content={msg.content}
                  isUser={msg.isUser}
                  timestamp={msg.timestamp ? new Date(msg.timestamp) : new Date()}
                  schoolCode={schoolCode}
                  availableKeywords={availableKeywords}
                />
              </div>
            ))}
            {isLoading && <TypingIndicator />}
          </div>
        </ScrollArea>
        {/* Chat Input */}
        <div className="px-6 py-5 border-t bg-white rounded-b-3xl">
          <div className="flex items-center space-x-3">
            <Input
              type="text"
              placeholder="Ask about admissions, fees, documents..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-gray-300 rounded-full px-5 py-3 text-base focus:outline-none focus:border-school-blue focus:ring-2 focus:ring-school-blue focus:ring-opacity-20 shadow-sm"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="bg-school-blue hover:bg-school-deep text-white w-12 h-12 rounded-full shadow"
              size="icon"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center">
            Powered by Entab
          </p>
        </div>
      </div>
    </div>
  );
}
