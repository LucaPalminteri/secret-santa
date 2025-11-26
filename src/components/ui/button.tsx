import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: use green for primary actions to avoid confusion with destructive red
        default: "bg-green-600 text-white shadow hover:bg-green-700",
        // Destructive: reserved for delete/cancel actions
        destructive: "bg-red-600 text-white shadow-sm hover:bg-red-700",
        // Outline: green border, white background
        outline: "border border-green-700 bg-white text-green-800 shadow-sm hover:bg-green-50",
        // Secondary: lighter green tone
        secondary: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700",
        // Ghost: subtle green tint on hover
        ghost: "hover:bg-green-50 hover:text-green-800",
        // Link: green colored link
        link: "text-green-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";

export { Button, buttonVariants };
