"use client";

import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useTranslations } from "next-intl";
import type {
  ChoosableAccount,
  ConnectCallback,
  HostedOutcome,
  Platform,
} from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  AccountPickerView,
  toggled,
} from "#components/channels/account-picker-view.tsx";
import {
  canRetry,
  chooseHostedAccounts,
  completeHostedLink,
  hostedFailureOf,
  tokenHeaders,
} from "#connect-link/hosted-api.ts";
import type { HostedFailure } from "#connect-link/hosted-api.ts";
import { forgetLink } from "#connect-link/pending-link.ts";
import { Link } from "#i18n/navigation.ts";

import { HostedConnected, HostedError, ReturnLink } from "./hosted-views.tsx";

type Connected = Extract<HostedOutcome, { readonly _tag: "connected" }>;

type Choice = Extract<HostedOutcome, { readonly _tag: "choose" }>;

// How long the page says what was connected before it goes back.
const returnDelayMs = 2000;

const unknown: HostedFailure = { error: "unknown", returnTo: null };

// What a failed sign-in leaves: why, a way to try the link again while it
// can be, and the way back to whoever sent the link.
const Failed = ({
  failure,
  token,
}: {
  readonly failure: HostedFailure;
  readonly token: string;
}) => {
  const t = useTranslations("ConnectLink");

  return (
    <div className="flex flex-col gap-4">
      <HostedError error={failure.error} />
      <div className="flex flex-wrap gap-2">
        {canRetry(failure.error) ? (
          <Button
            render={
              <Link href={`/connect/link#${encodeURIComponent(token)}`} />
            }
          >
            {t("tryAgain")}
          </Button>
        ) : null}
        {failure.returnTo === null ? null : (
          <ReturnLink label={t("back")} returnTo={failure.returnTo} />
        )}
      </div>
    </div>
  );
};

// The accounts the sign-in reached, to tick those to connect.
const Picker = ({
  choice,
  onConnected,
  platform,
  token,
}: {
  readonly choice: Choice;
  readonly onConnected: (connected: Connected) => void;
  readonly platform: Platform;
  readonly token: string;
}) => {
  const t = useTranslations("ConnectLink");
  const choose = useAtomSet(chooseHostedAccounts, { mode: "promiseExit" });
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [failure, setFailure] = useState<HostedFailure | null>(null);
  const [isPending, startTransition] = useTransition();

  const accounts: readonly ChoosableAccount[] = choice.accounts;

  const handleSubmit = () => {
    startTransition(async () => {
      const exit = await choose({
        headers: tokenHeaders(token),
        payload: { accountIds: [...selected], selection: choice.selection },
      });

      if (exit._tag === "Success" && exit.value._tag === "connected") {
        onConnected(exit.value);

        return;
      }

      setFailure(Option.getOrElse(hostedFailureOf(exit), () => unknown));
    });
  };

  const again = (
    <Button
      variant="outline"
      render={<Link href={`/connect/link#${encodeURIComponent(token)}`} />}
    >
      {t("tryAgain")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      {failure === null ? null : <HostedError error={failure.error} />}
      <AccountPickerView
        accounts={accounts}
        cancel={again}
        error={null}
        isPending={isPending}
        platform={platform}
        selected={selected}
        startOver={null}
        onSubmit={handleSubmit}
        onToggle={(accountId, checked) => {
          setSelected((before) =>
            toggled(accounts, before, accountId, checked)
          );
        }}
      />
    </div>
  );
};

interface CompleteHostedConnectionProps {
  /** What the platform added to the page's address; null if unreadable. */
  readonly callback: ConnectCallback | null;
  readonly platform: Platform;
  /** The link this tab started the sign-in from. */
  readonly token: string;
}

/**
 * Hands what the platform sent back to the server, for the link this tab
 * came from, then says what was connected and goes back to whoever sent
 * the link, when the link says where.
 */
export const CompleteHostedConnection = ({
  callback,
  platform,
  token,
}: CompleteHostedConnectionProps) => {
  const t = useTranslations("ConnectLink");
  const complete = useAtomSet(completeHostedLink, { mode: "promiseExit" });
  const [connected, setConnected] = useState<Connected | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [failure, setFailure] = useState<HostedFailure | null>(null);

  // React runs effects twice in development; a callback completes once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current || callback === null) {
      return;
    }

    started.current = true;

    const finish = async (payload: ConnectCallback) => {
      const exit = await complete({ headers: tokenHeaders(token), payload });

      if (exit._tag === "Success") {
        if (exit.value._tag === "connected") {
          setConnected(exit.value);
        } else {
          setChoice(exit.value);
        }

        return;
      }

      setFailure(Option.getOrElse(hostedFailureOf(exit), () => unknown));
    };

    void finish(callback);
  }, [callback, complete, token]);

  // Once connected, the tab is done with the link.
  useEffect(() => {
    if (connected !== null) {
      forgetLink();
    }
  }, [connected]);

  // It then goes back, after a moment to read what happened, where the
  // link says, unless the link waits on other platforms still.
  const returnTo =
    connected === null || connected.remaining.length > 0
      ? null
      : connected.returnTo;

  useEffect(() => {
    const timer =
      returnTo === null
        ? undefined
        : globalThis.setTimeout(() => {
            globalThis.location.replace(returnTo);
          }, returnDelayMs);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [returnTo]);

  if (connected !== null) {
    return (
      <HostedConnected
        again={<Link href={`/connect/link#${encodeURIComponent(token)}`} />}
        handles={connected.channels.map(({ handle }) => handle)}
        platform={platform}
        remaining={connected.remaining}
        returnTo={connected.returnTo}
      />
    );
  }

  if (failure !== null) {
    return <Failed failure={failure} token={token} />;
  }

  if (choice !== null) {
    return (
      <Picker
        choice={choice}
        platform={platform}
        token={token}
        onConnected={setConnected}
      />
    );
  }

  if (callback === null) {
    return (
      <Failed
        failure={{ error: "invalidState", returnTo: null }}
        token={token}
      />
    );
  }

  return (
    <p className="text-muted-foreground text-sm" aria-live="polite">
      {t("finishing")}
    </p>
  );
};
