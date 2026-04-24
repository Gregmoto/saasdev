import { cn } from "../utils";
const variants = {
  default: "bg-zinc-100 text-zinc-700",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};
interface BadgeProps { children: React.ReactNode; variant?: keyof typeof variants; className?: string }
export function Badge({ children, variant = "default", className }: BadgeProps) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant], className)}>{children}</span>;
}
