"use client";

import { useRef, type ReactNode, type RefObject } from "react";
import { Button } from "./ui/button";
import { Drawer, DrawerClose, DrawerContent, DrawerTitle } from "./ui/drawer";

export default function EditDrawer({
  open,
  onClose,
  triggerRef,
  title,
  busy,
  onSubmit,
  children,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  title: string;
  busy: boolean;
  onSubmit: (form: HTMLFormElement) => void;
  children: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
      }}
      dismissible={!busy}
      autoFocus
      handleOnly
    >
      <DrawerContent
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          const firstInput =
            formRef.current?.querySelector<HTMLInputElement>("input:enabled");
          if (firstInput) {
            // Radix selects the input text by default, which prevents Vaul from dragging.
            event.preventDefault();
            firstInput.focus({ preventScroll: true });
          }
        }}
        onCloseAutoFocus={(event) => {
          if (triggerRef.current?.isConnected) {
            event.preventDefault();
            triggerRef.current.focus({ preventScroll: true });
          }
        }}
      >
        <form
          ref={formRef}
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (open && !busy) onSubmit(event.currentTarget);
          }}
          className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 pt-1 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6"
        >
          <DrawerTitle className="text-xl font-extrabold leading-tight">
            {title}
          </DrawerTitle>
          {children}
          <div className="grid grid-cols-2 gap-3">
            <DrawerClose asChild>
              <Button variant="outline" disabled={busy}>
                Cancelar
              </Button>
            </DrawerClose>
            <Button type="submit" disabled={busy}>
              Guardar
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
