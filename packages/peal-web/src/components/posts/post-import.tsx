"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type {
  SocialChannel,
  ChannelSet,
  PlanLimitReached,
} from "peal-contract";
import { useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";

import { workspaceChannelSets } from "#channel-sets/atoms.ts";
import { channelName } from "#channels/channel-name.ts";
import { OfferUpgrade } from "#components/billing/offer-upgrade.tsx";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import { importPosts, postsKeys, workspaceChannels } from "#posts/api.ts";
import { readImportFile } from "#posts/import-file.ts";
import { newImportKey } from "#posts/import-key.ts";
import { sampleCsv } from "#posts/import-sample.ts";
import {
  canImport,
  idleImport,
  isBusy,
  nextImport,
  settle,
} from "#posts/import-state.ts";
import type { ImportState } from "#posts/import-state.ts";
import { oneAtATime } from "#posts/one-at-a-time.ts";

import {
  ImportChannelsView,
  ImportFileField,
  ImportHelpView,
  ImportStateView,
} from "./post-import-views.tsx";

const ignore = () => {
  // Nothing is chosen before the page hydrates: the field is disabled.
};

const noChannels: readonly SocialChannel[] = [];
const noSets: readonly ChannelSet[] = [];

// The plan's refusal among the rows, which the upgrade dialog offers a
// way past: it comes inside a 200 answer, not as a failed request.
const planRefusalOf = (state: ImportState): PlanLimitReached | null => {
  if (state._tag !== "checked" && state._tag !== "imported") {
    return null;
  }

  for (const row of state.rows) {
    if (row._tag === "refused" && row.refusal._tag === "PlanLimitReached") {
      return row.refusal;
    }
  }

  return null;
};

// Hands the browser a file to save, made here.
const download = (name: string, text: string) => {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = name;
  anchor.click();
  // Some browsers start the download after the click returns.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};

// The screen once hydrated: its requests carry the visitor's cookies,
// which only the browser sends.
const LoadedImport = ({ workspaceId }: { readonly workspaceId: string }) => {
  const t = useTranslations("Posts.Import");
  const send = useAtomSet(importPosts, { mode: "promiseExit" });
  const [state, dispatch] = useReducer(nextImport, idleImport);
  const [fileName, setFileName] = useState<string | null>(null);
  const guard = useMemo(() => oneAtATime(), []);
  const input = useRef<HTMLInputElement>(null);

  const channelsResult = useAtomValue(workspaceChannels(workspaceId));
  const setsResult = useAtomValue(workspaceChannelSets(workspaceId));

  const channels = Option.getOrElse(
    AsyncResult.value(channelsResult),
    () => noChannels
  );

  const sets = Option.getOrElse(AsyncResult.value(setsResult), () => noSets);

  // The check's key is made before it is sent, kept only if every row
  // passes.
  const check = async (csv: string) => {
    dispatch(
      await settle(
        "check",
        () => newImportKey(crypto),
        async () =>
          await send({
            headers: {},
            params: { workspaceId },
            payload: { csv, dryRun: true },
          })
      )
    );
  };

  const make = async (csv: string, key: string) => {
    dispatch(
      await settle(
        "import",
        () => key,
        async (sent) =>
          await send({
            headers: { "idempotency-key": sent },
            params: { workspaceId },
            payload: { csv },
            reactivityKeys: postsKeys,
          })
      )
    );
  };

  const handleChoose = (file: File) => {
    void guard.run(async () => {
      setFileName(file.name);

      const read = await readImportFile(file);

      dispatch({ _tag: "chosen", file: read });

      if (read._tag === "read") {
        await check(read.csv);
      }
    });
  };

  const handleConfirm = () => {
    if (state._tag !== "checked" || state.key === null || !canImport(state)) {
      return;
    }

    const { csv, key } = state;

    void guard.run(async () => {
      dispatch({ _tag: "confirmed" });
      await make(csv, key);
    });
  };

  // The same step again: the same file, and for an import the same key.
  const handleRetry = () => {
    if (state._tag !== "failed") {
      return;
    }

    const { step } = state;

    void guard.run(async () => {
      dispatch({ _tag: "retried" });

      await (step._tag === "checking"
        ? check(step.csv)
        : make(step.csv, step.key));
    });
  };

  const handleCopy = (channel: SocialChannel) => {
    void navigator.clipboard
      .writeText(channel.id)
      .then(() =>
        toast.success(t("channels.copied", { channel: channelName(channel) }))
      )
      .catch(() => toast.error(t("channels.copyFailed")));
  };

  const handleSample = () => {
    download(
      t("help.sampleName"),
      sampleCsv({
        texts: [t("sample.first"), t("sample.second"), t("sample.third")],
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: new Date().getFullYear(),
      })
    );
  };

  const busy = isBusy(state);

  // A link to each post the import made.
  const postLinks = new Map(
    (state._tag === "imported" ? state.rows : []).flatMap((row) =>
      row._tag === "created"
        ? [
            [
              row.post.id,
              <Link
                key={row.post.id}
                href={`/app/${workspaceId}/posts/${row.post.id}`}
                className="text-sm underline-offset-4 hover:underline"
              >
                {t("openPost")}
              </Link>,
            ] as const,
          ]
        : []
    )
  );

  // The channels, once read: their ids are what a row's channels name.
  let channelsSection = (
    <p className="text-muted-foreground text-sm" aria-busy>
      {t("channels.loading")}
    </p>
  );

  if (AsyncResult.isSuccess(channelsResult)) {
    channelsSection = (
      <ImportChannelsView
        channels={channels}
        sets={sets.map(({ name }) => name)}
        onCopy={handleCopy}
      />
    );
  } else if (AsyncResult.isFailure(channelsResult)) {
    channelsSection = (
      <p className="text-muted-foreground text-sm">{t("channels.failed")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <ImportFileField
          disabled={busy}
          fileName={fileName}
          inputRef={input}
          onChoose={handleChoose}
        />
        <ImportStateView
          channels={channels}
          state={state}
          postLinks={postLinks}
          onChooseAgain={() => input.current?.click()}
          onConfirm={handleConfirm}
          onRetry={handleRetry}
        />
        <OfferUpgrade failure={planRefusalOf(state)} />
      </section>
      <ImportHelpView onDownloadSample={handleSample} />
      {channelsSection}
    </div>
  );
};

/**
 * Imports posts from a CSV file: the member chooses it, the server checks
 * every row (`dryRun`), and Import, offered once every row is valid, asks
 * once and sends the same file under the key made when its check passed.
 * One request at a time, refused synchronously.
 */
export const PostImport = ({ workspaceId }: { readonly workspaceId: string }) =>
  useHydrated() ? (
    <LoadedImport workspaceId={workspaceId} />
  ) : (
    <ImportFileField disabled fileName={null} onChoose={ignore} />
  );
