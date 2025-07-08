import { GraduationCap, FileText, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  onQuickAction: (query: string) => void;
}

// Replace RupeeIcon with a text-based rupee symbol
const RupeeIcon = (props: any) => (
  <span style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1, display: 'inline-block', ...props?.style }} {...props}>
    ₹
  </span>
);

// Now define quickActions array
const quickActions = [
  {
    id: "admissions",
    label: "Admissions",
    icon: GraduationCap,
    query: "Tell me about admissions for 2025-2026",
  },
  {
    id: "fees",
    label: "Fee Structure",
    icon: RupeeIcon,
    query: "What is the fee structure and payment rules?",
  },
  {
    id: "documents",
    label: "Documents",
    icon: FileText,
    query: "What documents are required for admission?",
  },
  {
    id: "contact",
    label: "Contact Info",
    icon: Phone,
    query: "How can I contact the school and what are the office hours?",
  },
];

export function QuickActions({ onQuickAction }: QuickActionsProps) {
  return (
    <div className="p-2 bg-school-light border-b rounded-2xl">
      <p className="text-sm text-school-deep mb-2 font-medium">
        Quick Actions:
      </p>
      <div className="grid grid-cols-2 gap-1 sm:gap-2 rounded-xl bg-blue-50 p-2">
        {quickActions.map((action) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={action.id}
              onClick={() => onQuickAction(action.query)}
              variant="outline"
              size="sm"
              className="bg-white border-school-blue text-school-blue px-2 py-2 sm:px-3 text-xs sm:text-sm hover:bg-school-blue hover:text-white transition-colors rounded-lg flex items-center justify-center"
            >
              <span className="hidden sm:inline"><IconComponent className="w-3 h-3 mr-1" /></span>
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
