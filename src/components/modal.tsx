"use client";

import React, { useEffect, useId, useRef } from "react";

type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onSubmit?: () => void;
};

export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  onSubmit,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLFormElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!open) return;

    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusableElements = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'input:not(:disabled), button:not(:disabled), [href], [tabindex="0"]',
        ) ?? [],
      );
    (focusableElements()[0] ?? panelRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChangeRef.current(false);
      if (e.key !== "Tab") return;
      const elements = focusableElements();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) {
        e.preventDefault();
        panelRef.current?.focus();
        return;
      }
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panelRef.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === panelRef.current)
      ) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-auto"
    >
      <div
        className="dialog-backdrop absolute inset-0 bg-black/35"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      <form
        ref={panelRef}
        tabIndex={-1}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit?.();
        }}
        className="dialog-panel relative w-full max-w-md max-h-[calc(100dvh-2rem)] mx-auto bg-white rounded-xl border border-border shadow-lg overflow-y-auto"
      >
        {title || description ? (
          <div className="px-6 pt-6 space-y-1">
            {title ? (
              <h2
                id={titleId}
                className="text-xl font-semibold text-foreground"
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p id={descId} className="text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="p-6">{children}</div>

        {footer ? <div className="p-6">{footer}</div> : null}
      </form>
    </div>
  );
}
