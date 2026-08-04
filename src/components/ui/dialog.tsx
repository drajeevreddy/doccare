"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="fixed inset-0 bg-black/20 animate-fade-in" />
      <div
        className={cn(
          "relative z-50 w-full max-w-lg animate-scale-in rounded-xl border border-border bg-surface p-6 shadow-lg",
          className
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h2 className="text-base font-semibold text-primary">{title}</h2>}
            {description && <p className="text-sm text-secondary mt-1">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-hover flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-secondary" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border", className)}>
      {children}
    </div>
  );
}
