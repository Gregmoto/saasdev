import { cn } from "../utils";
export function Table({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className="overflow-x-auto"><table className={cn("w-full text-sm text-left", className)}>{children}</table></div>;
}
export function Thead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 border-b border-zinc-200">{children}</thead>;
}
export function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}
export function Td({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <td className={cn("px-4 py-4 text-zinc-700", className)}>{children}</td>;
}
export function Tr({ className, children }: { className?: string; children: React.ReactNode }) {
  return <tr className={cn("border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors", className)}>{children}</tr>;
}
