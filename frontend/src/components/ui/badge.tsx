import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "muted";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variantStyles = {
    default: "border-transparent bg-zinc-100 text-zinc-900 shadow",
    secondary: "border-zinc-800 bg-zinc-800/80 text-zinc-300",
    outline: "border-zinc-700 text-zinc-300",
    destructive: "border-rose-900/60 bg-rose-950/50 text-rose-300",
    success: "border-emerald-900/60 bg-emerald-950/50 text-emerald-300",
    warning: "border-amber-900/60 bg-amber-950/50 text-amber-300",
    muted: "border-zinc-800 bg-zinc-900 text-zinc-400",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
