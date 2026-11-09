"use client";

import { useAtomSet } from "@effect/atom-react";
import type { ConnectCallback, Platform } from "acme-contract";
import { Alert, AlertDescription, AlertTitle } from "acme-ui/components/alert";
import { Button } from "acme-ui/components/button";
import { Option } from "effect";
import { constVoid } from "effect/Function";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { useChannelErrorText } from "#channels/channel-error-text.ts";
import { completeConnection, failureOf } from "#channels/channels-api.ts";
import type { ChannelErrorKey } from "#channels/channels-api.ts";
import {
  forgetConnection,
  pendingWorkspace,
} from "#channels/pending-connection.ts";
import { Link, useRouter } from "#i18n/navigation.ts";

// The tab's storage only changes from this page's own actions.
const ignoreChanges = () => constVoid;

// The server cannot read the tab's storage: it renders the waiting state,
// under a value no workspace id takes.
const notYetKnown = "";

const unknownOnServer = () => notYetKnown;

interface FailedProps {
  readonly message: string;
  readonly workspaceId: string | null;
}

const Failed = ({ message, workspaceId }: FailedProps) => {
  const t = useTranslations("ConnectCallbackPage");

  return (
    <div className="flex flex-col gap-4">
      <Alert variant="destructive">
        <AlertTitle>{t("failedTitle")}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
      {workspaceId === null ? (
        <Button
          variant="outline"
          render={<Link href="/app" />}
          nativeButton={false}
        >
          {t("toWorkspaces")}
        </Button>
      ) : (
        <Button
          variant="outline"
          render={<Link href={`/app/${workspaceId}/channels`} />}
          nativeButton={false}
        >
          {t("toChannels")}
        </Button>
      )}
    </div>
  );
};

interface CompleteConnectionProps {
  /** What the platform added to the page's address; null if unreadable. */
  readonly callback: ConnectCallback | null;
  readonly platform: Platform;
}

// Hands what the platform sent back to the server, for the workspace this
// tab started the connection in, then returns to its channels.
export const CompleteConnection = ({
  callback,
  platform,
}: CompleteConnectionProps) => {
  const t = useTranslations("ConnectCallbackPage");
  const errors = useChannelErrorText();
  const router = useRouter();
  const complete = useAtomSet(completeConnection, { mode: "promiseExit" });

  // Kept with its workspace: the tab forgets the connection once it is back.
  const [failure, setFailure] = useState<{
    readonly error: ChannelErrorKey;
    readonly workspaceId: string;
  } | null>(null);

  // React runs effects twice in development; a callback completes once.
  const started = useRef(false);

  const workspaceId = useSyncExternalStore(
    ignoreChanges,
    () => pendingWorkspace(platform),
    unknownOnServer
  );

  useEffect(() => {
    if (
      started.current ||
      workspaceId === notYetKnown ||
      workspaceId === null ||
      callback === null
    ) {
      return;
    }

    started.current = true;

    const finish = async (workspace: string, payload: ConnectCallback) => {
      const exit = await complete({
        params: { platform, workspaceId: workspace },
        payload,
      });

      forgetConnection();

      if (exit._tag === "Success") {
        toast.success(t("connected", { handle: exit.value.handle }));
        router.replace(`/app/${workspace}/channels`);

        return;
      }

      setFailure({
        error: Option.getOrElse(failureOf(exit), () => "unknown" as const),
        workspaceId: workspace,
      });
    };

    void finish(workspaceId, callback);
  }, [callback, complete, platform, router, t, workspaceId]);

  if (failure !== null) {
    return (
      <Failed
        message={errors(failure.error)}
        workspaceId={failure.workspaceId}
      />
    );
  }

  if (workspaceId === null) {
    return <Failed message={t("lost")} workspaceId={null} />;
  }

  if (workspaceId !== notYetKnown && callback === null) {
    return (
      <Failed message={errors("invalidState")} workspaceId={workspaceId} />
    );
  }

  return (
    <p className="text-muted-foreground text-sm" aria-live="polite">
      {t("connecting")}
    </p>
  );
};
