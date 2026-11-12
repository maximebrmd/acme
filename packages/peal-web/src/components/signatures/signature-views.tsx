"use client";

import { Option } from "effect";
import { useTranslations } from "next-intl";
import { maxSignatureLength, maxSignatureNameLength } from "peal-contract";
import type { Channel, Platform, Signature } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { Textarea } from "peal-ui/components/textarea";
import type { ReactNode } from "react";

import { channelName } from "#channels/channel-name.ts";
import { SavedItemErrorAlert } from "#components/settings/saved-item-error.tsx";
import type { SavedItemError } from "#settings/saved-item-error.ts";
import { platformOf, ScopeKindSchema } from "#signatures/draft.ts";
import type { SignatureDraft } from "#signatures/draft.ts";

// The views of a workspace's signatures: what a signature and its form
// look like, whatever fetched them. The settings page's state lives in
// signatures-settings.tsx.

/** Writes what a signature is for: the workspace, a platform, a channel. */
export const useScopeText = (channels: readonly Channel[]) => {
  const t = useTranslations("Signatures");
  const tPosts = useTranslations("Posts");

  return (scope: Signature["scope"]): string => {
    if (scope._tag === "workspace") {
      return t("scopeWorkspace");
    }

    if (scope._tag === "platform") {
      return t("scopePlatform", {
        platform: tPosts("platform", { platform: scope.platform }),
      });
    }

    const channel = channels.find(({ id }) => id === scope.channelId);

    return channel === undefined
      ? t("scopeChannelGone")
      : t("scopeChannel", {
          handle: channelName(channel),
          platform: tPosts("platform", { platform: channel.platform }),
        });
  };
};

// The platforms a signature can be for: those of the connected channels,
// and the one the form already holds.
const platformsOf = (
  channels: readonly Channel[],
  held: Platform | undefined
): readonly Platform[] => [
  ...new Set([
    ...channels.map(({ platform }) => platform),
    ...(held === undefined ? [] : [held]),
  ]),
];

/**
 * A signature's form: its name, its text counted against the limit, what
 * it is for, and whether new posts take it by default.
 */
export const SignatureFieldsView = ({
  channels,
  disabled,
  draft,
  error,
  idPrefix,
  onChange,
}: {
  /** The workspace's connected channels. */
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
  readonly draft: SignatureDraft;
  readonly error: SavedItemError | null;
  /** Tells this form's fields from another's on the page. */
  readonly idPrefix: string;
  readonly onChange: (draft: SignatureDraft) => void;
}) => {
  const t = useTranslations("Signatures");
  const tPosts = useTranslations("Posts");
  const nameId = `${idPrefix}-signature-name`;
  const textId = `${idPrefix}-signature-text`;
  const defaultId = `${idPrefix}-signature-default`;
  const platformId = `${idPrefix}-signature-platform`;
  const channelId = `${idPrefix}-signature-channel`;
  const { length } = draft.text.trim();
  const platforms = platformsOf(channels, draft.platform);
  const channel = channels.find(({ id }) => id === draft.channelId);

  const channelText = (shown: Channel) =>
    tPosts("Composer.channelDetail", {
      handle: channelName(shown),
      platform: tPosts("platform", { platform: shown.platform }),
    });

  return (
    <div className="flex flex-col gap-4">
      <SavedItemErrorAlert error={error} kind="signature" />
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor={nameId}>{t("name")}</Label>
        <Input
          id={nameId}
          value={draft.name}
          maxLength={maxSignatureNameLength}
          disabled={disabled}
          required
          aria-describedby={`${nameId}-hint`}
          onChange={(event) => {
            onChange({ ...draft, name: event.target.value });
          }}
        />
        <p id={`${nameId}-hint`} className="text-muted-foreground text-xs">
          {t("nameHint")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={textId}>{t("text")}</Label>
        <Textarea
          id={textId}
          value={draft.text}
          rows={4}
          disabled={disabled}
          required
          aria-describedby={`${textId}-count`}
          aria-invalid={length > maxSignatureLength}
          onChange={(event) => {
            onChange({ ...draft, text: event.target.value });
          }}
        />
        <p
          id={`${textId}-count`}
          className={
            length > maxSignatureLength
              ? "text-destructive text-xs"
              : "text-muted-foreground text-xs"
          }
        >
          {t("textCount", { count: length, max: maxSignatureLength })}
        </p>
      </div>
      <fieldset className="flex flex-col gap-3" disabled={disabled}>
        <legend className="mb-3 text-sm font-medium">{t("scope")}</legend>
        {ScopeKindSchema.literals.map((scope) => {
          const id = `${idPrefix}-signature-scope-${scope}`;

          return (
            <div key={scope} className="flex items-center gap-2">
              <input
                id={id}
                type="radio"
                name={`${idPrefix}-signature-scope`}
                className="accent-primary"
                checked={draft.scope === scope}
                onChange={() => {
                  onChange({ ...draft, scope });
                }}
              />
              <label htmlFor={id} className="text-sm">
                {t("scopeOption", { scope })}
              </label>
            </div>
          );
        })}
      </fieldset>
      {draft.scope === "platform" ? (
        <div className="flex max-w-sm flex-col gap-2">
          <Label id={platformId}>{t("platform")}</Label>
          {platforms.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noChannels")}</p>
          ) : (
            <Select
              value={draft.platform ?? null}
              disabled={disabled}
              onValueChange={(value) => {
                onChange({
                  ...draft,
                  platform: Option.getOrElse(
                    platformOf(value),
                    () => draft.platform
                  ),
                });
              }}
            >
              <SelectTrigger aria-labelledby={platformId}>
                <SelectValue>
                  {draft.platform === undefined
                    ? t("choosePlatform")
                    : tPosts("platform", { platform: draft.platform })}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {platforms.map((platform) => (
                  <SelectItem key={platform} value={platform}>
                    {tPosts("platform", { platform })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}
      {draft.scope === "channel" ? (
        <div className="flex max-w-sm flex-col gap-2">
          <Label id={channelId}>{t("channel")}</Label>
          {channels.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noChannels")}</p>
          ) : (
            <Select
              value={channel === undefined ? null : channel.id}
              disabled={disabled}
              onValueChange={(value) => {
                if (value !== null) {
                  onChange({ ...draft, channelId: value });
                }
              }}
            >
              <SelectTrigger aria-labelledby={channelId}>
                <SelectValue>
                  {channel === undefined
                    ? t("chooseChannel")
                    : channelText(channel)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {channels.map((shown) => (
                  <SelectItem key={shown.id} value={shown.id}>
                    {channelText(shown)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : null}
      <div className="flex items-start gap-2">
        <Checkbox
          id={defaultId}
          checked={draft.isDefault}
          disabled={disabled}
          aria-describedby={`${defaultId}-hint`}
          onCheckedChange={(checked) => {
            onChange({ ...draft, isDefault: checked });
          }}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor={defaultId}>{t("isDefault")}</Label>
          <p id={`${defaultId}-hint`} className="text-muted-foreground text-xs">
            {t("isDefaultHint")}
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * One of the workspace's signatures: its name, what it is for, whether it
 * is a default, and its text, with what a member may do to it (`actions`)
 * and what they opened under it (`children`).
 */
export const SignatureItemView = ({
  actions,
  channels,
  children,
  nameId,
  signature,
}: {
  readonly actions?: ReactNode;
  readonly channels: readonly Channel[];
  readonly children?: ReactNode;
  /** The id of the signature's name, which names its actions. */
  readonly nameId?: string;
  readonly signature: Signature;
}) => {
  const t = useTranslations("Signatures");
  const scopeText = useScopeText(channels);

  return (
    <li className="flex flex-col gap-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-2">
            <span id={nameId} className="font-medium">
              {signature.name}
            </span>
            {signature.isDefault ? (
              <Badge variant="secondary">{t("defaultBadge")}</Badge>
            ) : null}
          </span>
          <span className="text-muted-foreground text-sm">
            {scopeText(signature.scope)}
          </span>
        </div>
        {actions === undefined ? null : (
          <div className="flex flex-wrap gap-2">{actions}</div>
        )}
      </div>
      <p dir="auto" className="text-sm whitespace-pre-wrap">
        {signature.text}
      </p>
      {children}
    </li>
  );
};
