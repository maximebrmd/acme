"use client";

import { useFormatter } from "next-intl";

// An instant, in the reader's time zone once the page has hydrated (see
// ViewerTimeZone), from its ISO form, which Server Components pass on.
export const Instant = ({ value }: { readonly value: string }) => {
  const format = useFormatter();

  return (
    <time dateTime={value}>
      {format.dateTime(new Date(value), {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    </time>
  );
};
