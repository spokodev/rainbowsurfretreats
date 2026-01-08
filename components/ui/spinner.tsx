import { Loader2 } from "lucide-react";
import { cn } from "./utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
  variant?: "primary" | "muted" | "white";
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

const variantClasses = {
  primary: "text-[var(--primary-teal)]",
  muted: "text-muted-foreground",
  white: "text-white",
};

export function Spinner({
  size = "md",
  className,
  text,
  variant = "primary",
}: SpinnerProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Loader2
        className={cn("animate-spin", sizeClasses[size], variantClasses[variant])}
      />
      {text && <span className="text-sm text-gray-600">{text}</span>}
    </div>
  );
}

interface PageLoaderProps {
  text?: string;
  className?: string;
}

export function PageLoader({ text = "Loading...", className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "min-h-screen flex items-center justify-center",
        className
      )}
    >
      <div className="text-center">
        <Spinner size="xl" className="mx-auto mb-4" />
        <p className="text-gray-600">{text}</p>
      </div>
    </div>
  );
}
