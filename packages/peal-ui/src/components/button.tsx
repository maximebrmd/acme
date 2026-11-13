import { Button as ButtonPrimitive } from "@ui-sdk/react/button";
import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "group/button focus-visible:border-ring focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-3 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:ring-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-lg": "size-9",
        "icon-sm": "size-7",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        sm: "h-7 gap-1 px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-6 gap-1 px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        destructive:
          "bg-destructive/10 text-destructive-text hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground aria-expanded:bg-secondary aria-expanded:text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
      },
    },
  }
);

type Primitive = React.ComponentProps<typeof ButtonPrimitive>;

// ui-sdk's Button: a native button, or, through `render`, a link that keeps
// its link semantics. Callers may pass `undefined` for an option they leave
// unset (`onClick={canSave ? save : undefined}`), which ui-sdk's props, read
// with exactOptionalPropertyTypes, do not take: each is passed only when set.
type ButtonProps = Omit<
  React.ComponentProps<"button">,
  "children" | "className" | "disabled" | "onClick" | "style" | "type"
> &
  VariantProps<typeof buttonVariants> & {
    readonly children?: React.ReactNode;
    readonly className?: string | undefined;
    readonly disabled?: boolean | undefined;
    readonly focusableWhenDisabled?: boolean | undefined;
    readonly onClick?: Primitive["onClick"] | undefined;
    readonly pendingAnnouncement?: string | undefined;
    readonly render?: Primitive["render"] | undefined;
    readonly style?: React.CSSProperties | undefined;
    readonly type?: Primitive["type"] | undefined;
  };

const Button = ({
  className,
  disabled,
  focusableWhenDisabled,
  onClick,
  pendingAnnouncement,
  render,
  size = "default",
  style,
  type,
  variant = "default",
  ...props
}: ButtonProps) => (
  <ButtonPrimitive
    data-slot="button"
    className={cn(buttonVariants({ className, size, variant }))}
    {...props}
    {...(disabled === undefined ? {} : { disabled })}
    {...(focusableWhenDisabled === undefined ? {} : { focusableWhenDisabled })}
    {...(onClick === undefined ? {} : { onClick })}
    {...(pendingAnnouncement === undefined ? {} : { pendingAnnouncement })}
    {...(render === undefined ? {} : { render })}
    {...(style === undefined ? {} : { style })}
    {...(type === undefined ? {} : { type })}
  />
);

export { Button, buttonVariants };
