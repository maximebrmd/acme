import { HydrationBoundary } from "@effect/atom-react";
import { connection } from "next/server";

import { health } from "#api/health.ts";
import { prefetch } from "#api/prefetch.ts";
import { ApiStatusCard } from "#components/api-status.tsx";

// Checks the API while the page renders, at request time, so the status is in
// the HTML; the browser takes over from the same result.
export const ApiStatusSection = async () => {
  await connection();

  const state = await prefetch([health]);

  return (
    <HydrationBoundary state={state}>
      <ApiStatusCard />
    </HydrationBoundary>
  );
};
