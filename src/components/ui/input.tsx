import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        // Festive, accessible input styles: subtle white card, green borders on focus, soft inner shadow
        "flex h-10 w-full rounded-lg border bg-white/95 px-3 py-2 text-base text-gray-900 shadow-sm transition-all duration-200 placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "border-green-200 focus:border-green-600 focus-visible:ring-2 focus-visible:ring-green-300 focus-visible:outline-none",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
