import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const variantStyles = {
      default: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 shadow-sm font-medium",
      destructive: "bg-rose-950/80 text-rose-300 border border-rose-900/50 hover:bg-rose-900/60 font-medium",
      outline: "border border-zinc-800 bg-zinc-900/50 text-zinc-200 hover:bg-zinc-800 hover:text-zinc-100",
      secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-600",
      ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60",
      link: "text-zinc-300 underline-offset-4 hover:underline p-0 h-auto",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2 text-sm",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8 text-base",
      icon: "h-9 w-9 p-0 flex items-center justify-center",
    };

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
