"use client";

import React, { useEffect, useId } from "react";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({ open, onOpenChange, title, description, children, footer }: ModalProps) {
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-auto"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => onOpenChange(false)} aria-hidden />

      <div className="relative w-full max-w-lg mx-auto bg-white/95 rounded-xl shadow-md overflow-hidden transform transition-all duration-200 ease-out motion-safe:scale-100">
        {/* keep title/description for screen readers but hide visually to match minimalist card header removal */}
        {title || description ? (
          <div className="sr-only">
            {title ? <h3 id={titleId}>{title}</h3> : null}
            {description ? <p id={descId}>{description}</p> : null}
          </div>
        ) : null}

        <div className="p-4">{children}</div>

        {footer ? <div className="p-4">{footer}</div> : null}
      </div>
    </div>
  );
}
