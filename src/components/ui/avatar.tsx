"use client";

import { cn, getInitials } from "@/lib/utils";
import { forwardRef } from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  fallback?: string;
}

const sizeMap = {
  sm: "h-6 w-6 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-12 w-12 text-base",
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, src, size = "md", fallback, ...props }, ref) => {
    const initials = fallback || (name ? getInitials(name) : "??");

    if (src) {
      return (
        <div
          ref={ref}
          className={cn(
            "relative inline-flex shrink-0 overflow-hidden rounded-full",
            sizeMap[size],
            className
          )}
          {...props}
        >
          <img
            src={src}
            alt={name || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.classList.add("bg-hover", "items-center", "justify-center");
                const fallbackEl = document.createElement("span");
                fallbackEl.className = "font-medium text-secondary";
                fallbackEl.textContent = initials;
                parent.appendChild(fallbackEl);
              }
            }}
          />
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-hover font-medium text-secondary",
          sizeMap[size],
          className
        )}
        {...props}
      >
        {initials}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";

export { Avatar };
