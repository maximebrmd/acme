"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { SocialChannel, Signature } from "peal-contract";
import { Button } from "peal-ui/components/button";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { DeleteSavedItem } from "#components/settings/delete-saved-item.tsx";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { workspaceChannels } from "#posts/api.ts";
import { savedItemErrorOf } from "#settings/saved-item-error.ts";
import type { SavedItemError } from "#settings/saved-item-error.ts";
import {
  createSignature,
  deleteSignature,
  signaturesChanged,
  updateSignature,
  workspaceSignatures,
} from "#signatures/atoms.ts";
import {
  emptySignatureDraft,
  signatureDetailsOf,
  signatureDraftOf,
} from "#signatures/draft.ts";
import type { SignatureDraft } from "#signatures/draft.ts";

import { SignatureFieldsView, SignatureItemView } from "./signature-views.tsx";

// The workspace's connected channels, which a signature may be for; none
// while they load, or for a member who may not read them.
const useChannels = (workspaceId: string): readonly SocialChannel[] => {
  const channels = useAtomValue(workspaceChannels(workspaceId));

  return AsyncResult.isSuccess(channels) ? channels.value : [];
};

// A signature's form: everything it holds, saved together.
const EditForm = ({
  channels,
  onClose,
  signature,
  workspaceId,
}: {
  readonly channels: readonly SocialChannel[];
  readonly onClose: () => void;
  readonly signature: Signature;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Signatures");
  const settings = useTranslations("Settings");
  const update = useAtomSet(updateSignature, { mode: "promiseExit" });
  const [error, setError] = useState<SavedItemError | null>(null);
  const [isPending, startTransition] = useTransition();

  const [draft, setDraft] = useState<SignatureDraft>(() =>
    signatureDraftOf(signature)
  );

  const details = signatureDetailsOf(draft);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(details)) {
      return;
    }

    startTransition(async () => {
      const exit = await update({
        params: { signatureId: signature.id, workspaceId },
        payload: details.value,
        reactivityKeys: signaturesChanged(workspaceId),
      });

      Option.match(savedItemErrorOf(exit), {
        onNone: () => {
          toast.success(t("saved"));
          onClose();
        },
        onSome: setError,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SignatureFieldsView
        channels={channels}
        draft={draft}
        error={error}
        disabled={isPending}
        idPrefix={signature.id}
        onChange={setDraft}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isPending || Option.isNone(details)}
          focusableWhenDisabled
        >
          {isPending ? settings("saving") : t("save")}
        </Button>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          {settings("cancel")}
        </Button>
      </div>
    </form>
  );
};

// One signature, with its form once the member opened it.
const SignatureRow = ({
  channels,
  mayManage,
  signature,
  workspaceId,
}: {
  readonly channels: readonly SocialChannel[];
  readonly mayManage: boolean;
  readonly signature: Signature;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Signatures");
  const nameId = useId();
  const remove = useAtomSet(deleteSignature, { mode: "promiseExit" });
  const [editing, setEditing] = useState(false);

  return (
    <SignatureItemView
      channels={channels}
      signature={signature}
      nameId={nameId}
      {...(mayManage
        ? {
            actions: (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  aria-describedby={nameId}
                  aria-expanded={editing}
                  onClick={() => {
                    setEditing(!editing);
                  }}
                >
                  {t("edit")}
                </Button>
                <DeleteSavedItem
                  describedBy={nameId}
                  kind="signature"
                  title={t("deleteTitle", { name: signature.name })}
                  description={t("deleteDescription")}
                  deleted={t("deleted")}
                  remove={async () =>
                    await remove({
                      params: { signatureId: signature.id, workspaceId },
                      reactivityKeys: signaturesChanged(workspaceId),
                    })
                  }
                />
              </>
            ),
          }
        : {})}
    >
      {editing ? (
        <EditForm
          channels={channels}
          signature={signature}
          workspaceId={workspaceId}
          onClose={() => {
            setEditing(false);
          }}
        />
      ) : null}
    </SignatureItemView>
  );
};

const LoadedSignatures = ({
  channels,
  mayManage,
  workspaceId,
}: {
  readonly channels: readonly SocialChannel[];
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Signatures");
  const atom = workspaceSignatures(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {value.map((signature) => (
            <SignatureRow
              key={signature.id}
              channels={channels}
              mayManage={mayManage}
              signature={signature}
              workspaceId={workspaceId}
            />
          ))}
        </ul>
      ),
  });
};

// A new signature.
const CreateForm = ({
  channels,
  workspaceId,
}: {
  readonly channels: readonly SocialChannel[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Signatures");
  const create = useAtomSet(createSignature, { mode: "promiseExit" });
  const [draft, setDraft] = useState<SignatureDraft>(emptySignatureDraft);
  const [error, setError] = useState<SavedItemError | null>(null);
  const [isPending, startTransition] = useTransition();
  const details = signatureDetailsOf(draft);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(details)) {
      return;
    }

    startTransition(async () => {
      const exit = await create({
        params: { workspaceId },
        payload: details.value,
        reactivityKeys: signaturesChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        setError(null);
        setDraft(emptySignatureDraft);
        toast.success(t("created"));
      } else {
        setError(
          Option.getOrElse(savedItemErrorOf(exit), (): SavedItemError => ({
            key: "unknown",
          }))
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SignatureFieldsView
        channels={channels}
        draft={draft}
        error={error}
        disabled={isPending}
        idPrefix="new"
        onChange={setDraft}
      />
      <div>
        <Button
          type="submit"
          disabled={isPending || Option.isNone(details)}
          focusableWhenDisabled
        >
          {isPending ? t("creating") : t("create")}
        </Button>
      </div>
    </form>
  );
};

// The page once it has hydrated: the channels are read with the visitor's
// cookies.
const Loaded = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Signatures");
  const channels = useChannels(workspaceId);

  return (
    <>
      <section
        aria-labelledby="signatures-title"
        className="flex flex-col gap-2"
      >
        <h2 id="signatures-title" className="text-xl font-semibold">
          {t("listTitle")}
        </h2>
        <LoadedSignatures
          channels={channels}
          mayManage={mayManage}
          workspaceId={workspaceId}
        />
      </section>
      {mayManage ? (
        <section
          aria-labelledby="create-signature-title"
          className="flex flex-col gap-4"
        >
          <h2 id="create-signature-title" className="text-xl font-semibold">
            {t("createTitle")}
          </h2>
          <CreateForm channels={channels} workspaceId={workspaceId} />
        </section>
      ) : null}
    </>
  );
};

/**
 * The workspace's signatures: the list, and for those who may change
 * posts a form to add one, and to change or delete each.
 */
export const SignaturesSettings = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const hydrated = useHydrated();

  return (
    <div className="flex flex-col gap-8">
      {hydrated ? (
        <Loaded mayManage={mayManage} workspaceId={workspaceId} />
      ) : (
        <SettingsLoading />
      )}
    </div>
  );
};
