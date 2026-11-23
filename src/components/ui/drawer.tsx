"use client";

import type { ComponentProps } from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "@/lib/utils";

const Drawer = DrawerPrimitive.Root;
const DrawerClose = DrawerPrimitive.Close;
const DrawerTitle = DrawerPrimitive.Title;

function DrawerContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35" />
      <DrawerPrimitive.Content
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-lg flex-col rounded-t-[20px] border bg-card text-card-foreground shadow-lg outline-none",
          className,
        )}
        {...props}
      >
        <div className="shrink-0 py-3">
          <DrawerPrimitive.Handle
            preventCycle
            className="cursor-grab !bg-border active:cursor-grabbing"
          />
        </div>
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

export { Drawer, DrawerClose, DrawerContent, DrawerTitle };
