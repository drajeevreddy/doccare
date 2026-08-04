"use client";

import { cn, capitalize } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-hover text-primary",
        primary: "bg-accent-light text-accent",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        error: "bg-error/10 text-error",
        secondary: "bg-secondary/10 text-secondary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  status?: string;
}

export function Badge({ className, variant, status, children, ...props }: BadgeProps) {
  const statusVariant = status
    ? ({
        completed: "success" as const,
        paid: "success" as const,
        active: "success" as const,
        scheduled: "primary" as const,
        in_progress: "primary" as const,
        pending: "warning" as const,
        waiting: "warning" as const,
        overdue: "error" as const,
        cancelled: "error" as const,
        draft: "secondary" as const,
      }[status.toLowerCase()] || "default")
    : variant || "default";

  return (
    <span
      className={cn(badgeVariants({ variant: statusVariant }), className)}
      {...props}
    >
      {status ? capitalize(status) : children}
    </span>
  );
}
