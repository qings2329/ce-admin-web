import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

export interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: React.ReactNode;
}

export function Modal({ open, title, onClose, children, size = "md", footer }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === "sm" ? "w-[min(420px,92vw)]" :
    size === "lg" ? "w-[min(720px,94vw)]" :
    "w-[min(560px,92vw)]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55" onClick={onClose}>
      <div
        ref={panelRef}
        className={cn("rounded-xl border border-border bg-card p-5 shadow-2xl", sizeClass)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-4">{children}</div>
        {footer && (
          <div className="mt-4 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
