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
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
        className={`w-full max-w-full md:w-[516px] md:max-w-[98vw] ${isMobile ? 'h-screen' : 'h-[calc(98vh-58px)] md:h-[calc(46.25rem-58px)]'} bg-white rounded-3xl shadow-2xl border border-gray-200 flex flex-col animate-slide-up overflow-hidden m-0 sm:m-2 md:m-6`}
        onClick={e => e.stopPropagation()}
        style={isMobile ? { height: '100dvh', maxHeight: '100dvh' } : undefined}
      >
        {/* Header - hidden on mobile */}
        {!isMobile && (
          <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-5 pb-2" style={{ background: '#C8CEED' }}>
            <div className="flex items-center gap-2">
              <img
                src="/medium-shot-woman-working-as-real-estate-agsdsent.png"
                alt="Woman working as real estate agent"
                className="h-12 w-12 rounded-full object-cover mr-3 ring-2 ring-blue-200 shadow-sm"
                style={{ background: '#fff' }}
              />
              <span className="font-bold text-lg text-blue-900">Felicity</span>
              <span className="ai-badge flex items-center justify-center px-2 py-0.5 rounded-md bg-white border border-gray-300 shadow text-xs font-bold text-gray-700 ml-1" style={{letterSpacing: 0.5}}>AI</span>
            </div>
            <button onClick={onClose} className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow hover:bg-gray-50 transition">
              <span className="sr-only">Close</span>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L14 14M14 6L6 14" stroke="#1e293b" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        )}
        {/* Quick Actions (top, no label) - always at top, even on mobile */}
        <div className="px-2 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 bg-blue-50 border-b border-blue-100 rounded-2xl">
          <div className="bg-white border border-blue-100 rounded-xl p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 shadow-sm">
            <QuickActions onQuickAction={handleQuickAction} />
          </div>
        </div>
        {/* Chat Messages */}
        <ScrollArea className="flex-1 px-2 sm:px-6 py-3 sm:py-6 bg-gray-50 overflow-y-auto" ref={scrollAreaRef}>
          <div className="space-y-3 sm:space-y-5 pb-4">
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
                className="w-full max-w-xs md:max-w-[75%]"
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
        <div className="px-2 sm:px-6 py-4 sm:py-5 border-t bg-white rounded-b-3xl">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Input
              type="text"
              placeholder="Ask about admissions, fees, documents..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-gray-300 rounded-full px-4 sm:px-5 py-3 text-base focus:outline-none focus:border-school-blue focus:ring-2 focus:ring-school-blue focus:ring-opacity-20 shadow-sm"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isLoading}
              className="bg-school-blue hover:bg-school-deep text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow"
              size="icon"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-3 text-center flex items-center justify-center gap-1">
            <span>Powered by</span>
            <img src="https://images.yourstory.com/cs/images/companies/Entab-300X300-1615358510008.jpg?fm=auto&ar=1%3A1&mode=fill&fill=solid&fill-color=fff&format=auto&w=384&q=75" alt="Entab Logo" className="h-9 w-9 inline-block rounded-full mx-1" style={{ display: 'inline', verticalAlign: 'middle' }} />
            <span>BETA version</span>
          </p>
        </div>
      </div>
    </div>
  );
}
