"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { HostedLink } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";

import { forgetConnection } from "#channels/pending-connection.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  hostedFailureOf,
  hostedLinkOf,
  startHostedLink,
} from "#connect-link/hosted-api.ts";
import type { HostedErrorKey } from "#connect-link/hosted-api.ts";
import { rememberLink } from "#connect-link/pending-link.ts";

import {
  HostedCard,
  HostedError,
  HostedOver,
  HostedWelcome,
} from "./hosted-views.tsx";

// What the sign-in starts from: the server or the handle the visitor
// gave, under the name the platform's sign-in takes it by.
const startPayload = (input: HostedLink["input"], given: string) => {
  if (input === "handle") {
    return { handle: given };
  }

  return input === "instance" ? { instance: given } : {};
};

// A link that waits: asks what the sign-in needs, then leaves for the
// platform, the tab remembering which link it came from.
const Welcome = ({
  link,
  token,
}: {
  readonly link: HostedLink;
  readonly token: string;
}) => {
  const start = useAtomSet(startHostedLink, { mode: "promiseExit" });
  const [value, setValue] = useState("");
  const [error, setError] = useState<HostedErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStart = () => {
    startTransition(async () => {
      const exit = await start({
        params: { token },
        payload: startPayload(link.input, value.trim()),
      });

      if (exit._tag === "Success") {
        setError(null);
        // This tab is on a link's sign-in now, whatever it started before.
        forgetConnection();
        rememberLink({ platform: link.platform, token });
        globalThis.location.assign(exit.value.authorizationUrl);

        return;
      }

      setError(
        Option.match(hostedFailureOf(exit), {
          onNone: (): HostedErrorKey => "unknown",
          onSome: ({ error: why }) => why,
        })
      );
    });
  };

  return (
    <HostedWelcome
      error={error}
      isPending={isPending}
      link={link}
      value={value}
      onInput={setValue}
      onStart={handleStart}
    />
  );
};

const Loaded = ({ token }: { readonly token: string }) => {
  const t = useTranslations("ConnectLink");
  const atom = hostedLinkOf(token);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: ({ cause }) => {
      const failure = Option.getOrElse(
        hostedFailureOf(Exit.failCause(cause)),
        () => ({ error: "unknown" as const, returnTo: null })
      );

      return (
        <HostedCard host={null} title={t("title")}>
          <HostedError error={failure.error} />
          {failure.error === "notFound" ? null : (
            <div>
              <Button variant="outline" onClick={reload}>
                {t("retry")}
              </Button>
            </div>
          )}
        </HostedCard>
      );
    },
    onInitial: () => (
      <HostedCard host={null} title={t("title")}>
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {t("loading")}
        </p>
      </HostedCard>
    ),
    onSuccess: ({ value: link }) => (
      <HostedCard
        host={link.host}
        title={t("heading", { platform: link.platform })}
      >
        {link.status === "pending" ? (
          <Welcome link={link} token={token} />
        ) : (
          <HostedOver
            host={link.host}
            returnTo={link.returnTo}
            status={link.status}
          />
        )}
      </HostedCard>
    ),
  });
};

/**
 * A connect link's page: who asks for which account, and the way to the
 * platform's sign-in. It reads the link from the browser, once hydrated,
 * so the server counts each visitor by their own address.
 */
export const HostedConnect = ({ token }: { readonly token: string }) => {
  const t = useTranslations("ConnectLink");
  const hydrated = useHydrated();

  return hydrated ? (
    <Loaded token={token} />
  ) : (
    <HostedCard host={null} title={t("title")}>
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {t("loading")}
      </p>
    </HostedCard>
  );
};
