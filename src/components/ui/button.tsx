import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium font-mono transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 uppercase tracking-wider",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_20px_hsl(var(--primary)/0.7)] hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_0_10px_hsl(var(--destructive)/0.5)] hover:shadow-[0_0_20px_hsl(var(--destructive)/0.7)] hover:bg-destructive/90",
        outline:
          "border-2 border-primary bg-transparent text-primary shadow-[0_0_5px_hsl(var(--primary)/0.3)] hover:bg-primary/10 hover:shadow-[0_0_15px_hsl(var(--primary)/0.5)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_0_10px_hsl(var(--secondary)/0.5)] hover:shadow-[0_0_20px_hsl(var(--secondary)/0.7)] hover:bg-secondary/90",
        ghost:
          "text-foreground hover:bg-muted hover:text-primary",
        link:
          "text-primary underline-offset-4 hover:underline",
        neon:
          "relative border-2 border-primary bg-transparent text-primary before:absolute before:inset-0 before:bg-primary/10 hover:before:bg-primary/20 hover:shadow-[0_0_30px_hsl(var(--primary)/0.6)] transition-all",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
