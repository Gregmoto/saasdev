import { cn } from "../utils";
const variants = {
  default: "bg-zinc-50 border-zinc-200 text-zinc-700",
  success: "bg-green-50 border-green-200 text-green-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  error: "bg-red-50 border-red-200 text-red-800",
};
export function Alert({ variant = "default", title, children, className }: { variant?: keyof typeof variants; title?: string; children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border p-4", variants[variant], className)}>{title && <div className="font-medium mb-1">{title}</div>}<div className="text-sm">{children}</div></div>;
}
