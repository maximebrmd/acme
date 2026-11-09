import { cva } from "class-variance-authority";
import type { VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "../lib/utils";

const Table = ({ className, ...props }: React.ComponentProps<"table">) => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto">
    <table
      data-slot="table"
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
);

const TableHeader = ({
  className,
  ...props
}: React.ComponentProps<"thead">) => (
  <thead
    data-slot="table-header"
    className={cn("[&_tr]:border-b", className)}
    {...props}
  />
);

const TableBody = ({ className, ...props }: React.ComponentProps<"tbody">) => (
  <tbody
    data-slot="table-body"
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
);

const TableFooter = ({
  className,
  ...props
}: React.ComponentProps<"tfoot">) => (
  <tfoot
    data-slot="table-footer"
    className={cn(
      "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
);

const TableRow = ({ className, ...props }: React.ComponentProps<"tr">) => (
  <tr
    data-slot="table-row"
    className={cn(
      "hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
      className
    )}
    {...props}
  />
);

const TableHead = ({ className, ...props }: React.ComponentProps<"th">) => (
  <th
    data-slot="table-head"
    className={cn(
      "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
);

// A cell holds text, or a figure (`numeric`): right-aligned, in digits of
// one width, so a column of counts lines up.
const tableCellVariants = cva(
  "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "",
        numeric: "text-right tabular-nums",
      },
    },
  }
);

const TableCell = ({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"td"> & VariantProps<typeof tableCellVariants>) => (
  <td
    data-slot="table-cell"
    data-variant={variant}
    className={cn(tableCellVariants({ variant }), className)}
    {...props}
  />
);

const TableCaption = ({
  className,
  ...props
}: React.ComponentProps<"caption">) => (
  <caption
    data-slot="table-caption"
    className={cn("text-muted-foreground mt-4 text-sm", className)}
    {...props}
  />
);

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
