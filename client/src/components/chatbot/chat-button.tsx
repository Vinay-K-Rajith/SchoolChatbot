import { useState } from "react";
import { MessageCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInterface } from "./chat-interface";

export function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-school-blue hover:bg-school-deep text-white w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-bounce-gentle group relative"
          size="icon"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
          
          {/* Notification Badge */}
          <div className="absolute -top-2 -right-2 bg-school-orange text-white text-xs w-6 h-6 rounded-full flex items-center justify-center animate-pulse">
            <AlertCircle className="w-3 h-3" />
          </div>
        </Button>
      </div>

      {isOpen && (
        <ChatInterface 
          isOpen={isOpen} 
          onClose={() => setIsOpen(false)} 
          schoolCode={schoolCode}
        />
      )}
    </>
  );
}
