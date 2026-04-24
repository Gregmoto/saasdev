import { cn } from "../utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

const variants = {
  default: "bg-zinc-900 text-white hover:bg-zinc-700",
  outline: "border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-900",
  ghost: "hover:bg-zinc-100 text-zinc-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
