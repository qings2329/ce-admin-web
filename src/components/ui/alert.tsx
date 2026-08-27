import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const alertVariants = cva("relative w-full rounded-md border px-3 py-2 text-sm", {
  variants: {
    variant: {
      default: "border-border bg-background text-foreground",
      error: "border-destructive/40 bg-destructive/10 text-destructive",
      warn: "border-warning/40 bg-warning/10 text-warning",
      info: "border-info/40 bg-info/10 text-info",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {}

function Alert({ className, variant, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Alert, alertVariants };
