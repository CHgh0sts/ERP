"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  disableClose?: boolean;
};

const SIZE: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "lg",
  children,
  footer,
  disableClose,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !disableClose) onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, disableClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !disableClose) onClose();
      }}
    >
      <div
        className={cn(
          "bg-card text-card-foreground rounded-lg shadow-card-hover w-full border border-border overflow-hidden my-8",
          SIZE[size],
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 id="modal-title" className="font-semibold text-base">
              {title}
            </h3>
            {description ? <p className="text-xs text-muted-foreground mt-0.5">{description}</p> : null}
          </div>
          {!disableClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-md hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-6">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 px-6 py-4 bg-muted/40 border-t border-border">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
