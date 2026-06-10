import { CalendarIcon } from "lucide-react";
import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface NativeDatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function NativeDatePicker({ className, ...props }: NativeDatePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (inputRef.current) {
      if ('showPicker' in HTMLInputElement.prototype) {
        inputRef.current.showPicker();
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      <input
        ref={inputRef}
        type="date"
        className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-calendar-picker-indicator]:hidden"
        {...props}
      />
      <button 
        type="button"
        tabIndex={-1}
        onClick={handleIconClick}
        className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
