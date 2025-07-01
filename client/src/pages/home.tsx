import { ChatInterface } from "@/components/chatbot/chat-interface";
import { useLocation } from "wouter";

export default function Home() {
  const [location] = useLocation();
  // Extract school code from the first segment of the path
  const schoolCode = location.split("/").filter(Boolean)[0];

  if (!schoolCode) {
    return (
      <div className="font-inter bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="w-full max-w-2xl text-center text-lg text-gray-600">
          Please enter a school code in the URL (e.g., /LC001)
        </div>
      </div>
    );
  }

  return (
    <div className="font-inter bg-gray-50 min-h-screen flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex justify-end mb-2">
          <a href={`/${schoolCode}/dashboard`} className="text-school-blue underline font-medium">Go to Dashboard</a>
        </div>
        <ChatInterface isOpen={true} onClose={() => {}} schoolCode={schoolCode} />
      </div>
    </div>
  );
}
