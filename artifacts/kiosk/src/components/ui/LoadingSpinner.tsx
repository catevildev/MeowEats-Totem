import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className, size = 48 }: { className?: string, size?: number }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <Loader2 
        size={size} 
        className="animate-spin text-primary mb-4" 
      />
      <p className="text-muted-foreground font-medium animate-pulse">Carregando...</p>
    </div>
  );
}
