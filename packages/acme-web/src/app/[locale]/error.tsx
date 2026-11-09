"use client";

import { useEffect } from "react";

import { ErrorView } from "#components/error-view.tsx";
import { reportBrowserError } from "#errors/browser.ts";
import { Link } from "#i18n/navigation.ts";

// A page that failed, inside the app's frame: reported, then explained.
const PageError = ({
  error,
  retry,
}: {
  readonly error: unknown;
  readonly retry: () => void;
}) => {
  useEffect(() => {
    reportBrowserError(error, "boundary");
  }, [error]);

  return <ErrorView home={<Link href="/" />} onRetry={retry} />;
};

export default PageError;
