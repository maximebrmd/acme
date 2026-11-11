"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Cause, Match, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type {
  AccountStanding,
  Channel,
  ContentViolation,
  Media,
  TikTokAccount,
  TikTokCreator,
} from "peal-contract";
import { Button } from "peal-ui/components/button";
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
import { Separator } from "peal-ui/components/separator";
import { Skeleton } from "peal-ui/components/skeleton";
import { useEffect } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { channelName } from "#channels/channel-name.ts";
import { MediaThumbnail } from "#components/media/media-thumbnail.tsx";
import { MediaPicker } from "#components/posts/media-picker.tsx";
import {
  channelCapabilities,
  pinterestBoards,
  pinterestBoardSections,
  tiktokCreator,
} from "#posts/api.ts";
import { mediaItem } from "#posts/attached-media.ts";
import { blueskyLimits } from "#posts/bluesky-account.ts";
import type { ComposerFailure } from "#posts/composer-failure.ts";
import { choicesOf } from "#posts/lookup-choices.ts";
import type { LookupChoices } from "#posts/lookup-choices.ts";
import {
  fieldsOf,
  matchesMedia,
  isShown,
  problemsByField,
  violationsByField,
  withValue,
} from "#posts/target-options.ts";
import type {
  ChoiceField,
  LocalTimeField,
  LookupField,
  MediaField,
  NumberField,
  OptionField,
  OptionProblem,
  OptionValues,
  OptionViolation,
  PostMediaKinds,
  TagsField,
  MentionsField,
  TextField,
  ToggleField,
  YesNoField,
} from "#posts/target-options.ts";
import { fittedToCreator, creatorLimits } from "#posts/tiktok-account.ts";
import type { FieldLimits, CreatorLimits } from "#posts/tiktok-account.ts";

type Translate = ReturnType<typeof useTranslations<"Posts.Options">>;

type Value = boolean | string | undefined;

const decodeText = Schema.decodeUnknownOption(Schema.String);

// A text field's value; nothing typed yet is the empty string.
const textOf = (value: Value): string =>
  decodeText(value).pipe(Option.getOrElse(() => ""));

/** What a lookup field offers on a channel, and how to ask again. */
export interface LookupSource {
  readonly choices: LookupChoices;
  /** Reads the list again, after it could not be read. */
  readonly retry?: () => void;
}

interface FieldProps<F extends OptionField> {
  readonly disabled: boolean;
  readonly field: F;
  /** The account's values, for a field a lookup fills. */
  readonly lookup: LookupSource | undefined;
  /** How the account shows it, when its platform says (TikTok's creator). */
  readonly limits: FieldLimits;
  readonly id: string;
  readonly onValue: (value: Value) => void;
  readonly value: Value;
  /** What is wrong with the value, when anything is. */
  readonly problem: string | undefined;
  /** The workspace whose library a media field picks from. */
  readonly workspaceId: string | undefined;
}

const invalidOf = (t: Translate, field: OptionField) =>
  field.invalid === undefined ? t("invalid") : t(field.invalid);

// What is wrong with the field's value: as typed, which nothing sends
// until it is fixed, else as the last schedule found it.
const problemOf = (
  t: Translate,
  field: OptionField,
  problem: OptionProblem | OptionViolation
): string =>
  Match.valueTags(problem, {
    invalid: () => invalidOf(t, field),
    optionInvalid: () => invalidOf(t, field),
    optionMissing: () => t("missing"),
    optionTooLong: ({ length, maximum }) => t("tooLong", { length, maximum }),
    tooMany: ({ count, maximum }) => t("tooMany", { count, maximum }),
  });

const labelOf = (t: Translate, field: OptionField) =>
  "required" in field && field.required
    ? t("required", { label: t(field.label) })
    : t(field.label);

// The field's hint, then what is wrong with it, each with its own id.
const Notes = ({
  field,
  id,
  limits,
  problem,
}: {
  readonly field: OptionField;
  readonly id: string;
  readonly limits: FieldLimits;
  readonly problem: string | undefined;
}) => {
  const t = useTranslations("Posts.Options");
  // Each reason once, however many choices it closes.
  const closed = [...new Set(limits.closedChoices?.values())];

  return (
    <>
      {field.hint === undefined ? null : (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {t(field.hint)}
        </p>
      )}
      {limits.locked === undefined ? null : (
        <p className="text-muted-foreground text-xs">{t(limits.locked)}</p>
      )}
      {closed.map((reason) => (
        <p key={reason} className="text-muted-foreground text-xs">
          {t(reason)}
        </p>
      ))}
      {limits.note === undefined ? null : (
        <p className="text-muted-foreground text-xs">{t(limits.note)}</p>
      )}
      {problem === undefined ? null : (
        <p id={`${id}-error`} className="text-destructive-text text-xs">
          {problem}
        </p>
      )}
    </>
  );
};

const describedBy = (
  field: OptionField,
  id: string,
  problem: string | undefined
): string | undefined => {
  const ids = [
    ...(field.hint === undefined ? [] : [`${id}-hint`]),
    ...(problem === undefined ? [] : [`${id}-error`]),
  ];

  return ids.length === 0 ? undefined : ids.join(" ");
};

const inputTypeOf = (
  field: LocalTimeField | MentionsField | TagsField | TextField
): string => {
  if (field.kind === "localTime") {
    return "datetime-local";
  }

  return field.kind === "text" && field.date === true ? "date" : "text";
};

const TextInput = ({
  disabled,
  field,
  id,
  onValue,
  limits,
  problem,
  value,
}: FieldProps<LocalTimeField | MentionsField | TagsField | TextField>) => {
  const t = useTranslations("Posts.Options");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValue(event.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{labelOf(t, field)}</Label>
      <Input
        id={id}
        type={inputTypeOf(field)}
        autoComplete="off"
        disabled={disabled}
        value={textOf(value)}
        aria-invalid={problem !== undefined}
        aria-describedby={describedBy(field, id, problem)}
        onChange={handleChange}
      />
      <Notes field={field} id={id} limits={limits} problem={problem} />
    </div>
  );
};

interface Choice {
  readonly closed: boolean;
  readonly label: string;
  readonly value: string;
}

const ChoiceSelect = ({
  choices,
  disabled,
  field,
  id,
  onChoice,
  selected,
  limits,
  problem,
}: {
  readonly choices: readonly Choice[];
  readonly disabled: boolean;
  readonly field: OptionField;
  readonly id: string;
  readonly onChoice: (value: string) => void;
  readonly selected: string | undefined;
  readonly limits: FieldLimits;
  readonly problem: string | undefined;
}) => {
  const t = useTranslations("Posts.Options");
  const chosen = choices.find(({ value }) => value === selected);

  return (
    <div className="flex flex-col gap-2">
      <Label id={`${id}-label`}>{labelOf(t, field)}</Label>
      <Select
        value={chosen?.value ?? null}
        disabled={disabled}
        onValueChange={(next) => {
          const picked = choices.find(({ value }) => value === next);

          if (picked !== undefined && !picked.closed) {
            onChoice(picked.value);
          }
        }}
      >
        <SelectTrigger
          id={id}
          aria-labelledby={`${id}-label`}
          aria-invalid={problem !== undefined}
          aria-describedby={describedBy(field, id, problem)}
        >
          <SelectValue>{chosen?.label ?? t("choose")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {choices.map(({ closed, label, value }) => (
            <SelectItem key={value} value={value} disabled={closed}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Notes field={field} id={id} limits={limits} problem={problem} />
    </div>
  );
};

// The choice that chooses nothing again: no option's value is empty.
const nothing = "";

const ChoiceInput = ({
  field,
  onValue,
  value,
  ...rest
}: FieldProps<ChoiceField>) => {
  const t = useTranslations("Posts.Options");

  const offered = field.choices
    .filter(
      ({ value: choice }) =>
        rest.limits.choices === undefined || rest.limits.choices.has(choice)
    )
    .map((choice) => ({
      closed: rest.limits.closedChoices?.has(choice.value) ?? false,
      label: t(choice.label),
      value: choice.value,
    }));

  return (
    <ChoiceSelect
      {...rest}
      field={field}
      choices={
        field.none === undefined
          ? offered
          : [
              { closed: false, label: t(field.none), value: nothing },
              ...offered,
            ]
      }
      selected={Option.getOrUndefined(decodeText(value))}
      onChoice={(choice) => {
        onValue(choice === nothing ? undefined : choice);
      }}
    />
  );
};

const yes = "yes";

const no = "no";

const YesNoInput = ({
  field,
  onValue,
  value,
  ...rest
}: FieldProps<YesNoField>) => {
  const t = useTranslations("Posts.Options");

  const selected = Match.value(value).pipe(
    Match.when(true, () => yes),
    Match.when(false, () => no),
    Match.option
  );

  return (
    <ChoiceSelect
      {...rest}
      field={field}
      choices={[
        { closed: false, label: t(field.yes), value: yes },
        { closed: false, label: t(field.no), value: no },
      ]}
      selected={Option.getOrUndefined(selected)}
      onChoice={(choice) => {
        onValue(choice === yes);
      }}
    />
  );
};

const ToggleInput = ({
  disabled,
  field,
  id,
  onValue,
  limits,
  problem,
  value,
}: FieldProps<ToggleField>) => {
  const t = useTranslations("Posts.Options");
  const locked = limits.locked !== undefined;

  // A locked box shows the setting off, whatever the post held.
  const checked =
    !locked && (field.inverted === true ? value === false : value === true);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled || locked}
          aria-invalid={problem !== undefined}
          aria-describedby={describedBy(field, id, problem)}
          onCheckedChange={(ticked) => {
            onValue(field.inverted === true ? !ticked : ticked);
          }}
        />
        <Label htmlFor={id}>{t(field.label)}</Label>
      </div>
      <div className="pl-6">
        <Notes field={field} id={id} limits={limits} problem={problem} />
      </div>
    </div>
  );
};

const NumberInput = ({
  disabled,
  field,
  id,
  onValue,
  limits,
  problem,
  value,
}: FieldProps<NumberField>) => {
  const t = useTranslations("Posts.Options");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValue(event.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{t(field.label)}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={field.minimum}
        step={1}
        autoComplete="off"
        disabled={disabled}
        value={textOf(value)}
        aria-invalid={problem !== undefined}
        aria-describedby={describedBy(field, id, problem)}
        onChange={handleChange}
      />
      <Notes field={field} id={id} limits={limits} problem={problem} />
    </div>
  );
};

// Stands for no choice in a list: no platform's id is this word.
const noChoice = "none";

const loadingChoices: LookupChoices = { _tag: "loading" };

// The list a lookup filled: the account's values, with "None" first for a
// field that may stay empty, and the value the post holds when the list
// lacks it, so nothing chosen earlier is lost unseen.
const LoadedLookup = ({
  field,
  loaded,
  onValue,
  value,
  ...rest
}: FieldProps<LookupField> & {
  readonly loaded: Extract<LookupChoices, { readonly _tag: "loaded" }>;
}) => {
  const t = useTranslations("Posts.Options");
  const selected = textOf(value);
  const known = loaded.choices.some((choice) => choice.value === selected);

  const choices: readonly Choice[] = [
    ...(field.required === true
      ? []
      : [{ closed: false, label: t("lookupNone"), value: noChoice }]),
    ...loaded.choices.map((choice) => ({ ...choice, closed: false })),
    ...(selected === "" || known
      ? []
      : [
          {
            closed: false,
            label: t("lookupUnknown", { value: selected }),
            value: selected,
          },
        ]),
  ];

  return (
    <div className="flex flex-col gap-2">
      <ChoiceSelect
        {...rest}
        field={field}
        choices={choices}
        selected={selected === "" ? undefined : selected}
        onChoice={(choice) => {
          onValue(choice === noChoice ? undefined : choice);
        }}
      />
      {loaded.choices.length === 0 && field.empty !== undefined ? (
        <p className="text-muted-foreground text-xs">{t(field.empty)}</p>
      ) : null}
      {loaded.truncated ? (
        <p className="text-muted-foreground text-xs">
          {t("lookupTruncated", { count: loaded.choices.length })}
        </p>
      ) : null}
    </div>
  );
};

// A field a lookup fills: its list once read, and until then that it is
// being read, or why it could not be, with a way to ask again.
const LookupInput = (props: FieldProps<LookupField>) => {
  const t = useTranslations("Posts.Options");
  const { field, id, limits, lookup, problem } = props;
  const state = lookup?.choices ?? loadingChoices;
  const handleRetry = lookup?.retry;

  if (state._tag === "loaded") {
    return <LoadedLookup {...props} loaded={state} />;
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-none font-medium">{labelOf(t, field)}</p>
      <output className="text-sm">
        {state._tag === "loading"
          ? t("lookupLoading")
          : t("lookupFailed", { reason: state.reason })}
      </output>
      {state._tag === "failed" && handleRetry !== undefined ? (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={props.disabled}
            onClick={handleRetry}
          >
            {t("lookupRetry")}
          </Button>
        </div>
      ) : null}
      <Notes field={field} id={id} limits={limits} problem={problem} />
    </div>
  );
};

/** What a media field shows of the file it names. */
export type ChosenMedia =
  | { readonly _tag: "none" }
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed" }
  | { readonly _tag: "loaded"; readonly media: Media };

// The file chosen, small, or what stands in for it.
const ChosenPreview = ({ chosen }: { readonly chosen: ChosenMedia }) => {
  const t = useTranslations("Posts.Options");

  return Match.valueTags(chosen, {
    failed: () => (
      <p className="text-destructive-text text-sm">{t("mediaFailed")}</p>
    ),
    loaded: ({ media }) => (
      <span className="relative block size-20 shrink-0 overflow-hidden rounded-md border">
        <MediaThumbnail media={media} sizes="5rem" />
      </span>
    ),
    loading: () => (
      <span className="block size-20 shrink-0">
        <span className="sr-only">{t("mediaLoading")}</span>
        <Skeleton className="size-full" />
      </span>
    ),
    none: () => (
      <p className="text-muted-foreground text-sm">{t("mediaNone")}</p>
    ),
  });
};

/**
 * A field that names a file of the library: the file chosen, `picker` to
 * choose one, and a button to take it away.
 */
export const MediaOptionView = ({
  chosen,
  disabled,
  field,
  id,
  limits,
  onRemove,
  picker,
  problem,
}: {
  readonly chosen: ChosenMedia;
  readonly disabled: boolean;
  readonly field: MediaField;
  readonly id: string;
  readonly limits: FieldLimits;
  readonly onRemove: () => void;
  readonly picker: ReactNode;
  readonly problem: string | undefined;
}) => {
  const t = useTranslations("Posts.Options");

  return (
    <fieldset
      aria-describedby={describedBy(field, id, problem)}
      className="flex flex-col gap-2"
    >
      <legend className="mb-2 text-sm leading-none font-medium">
        {labelOf(t, field)}
      </legend>
      <div className="flex flex-wrap items-center gap-3">
        <ChosenPreview chosen={chosen} />
        <div className="flex flex-wrap gap-2">
          {picker}
          {chosen._tag === "none" ? null : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={onRemove}
            >
              {t("mediaRemove")}
            </Button>
          )}
        </div>
      </div>
      <Notes field={field} id={id} limits={limits} problem={problem} />
    </fieldset>
  );
};

// A file the field may name: one of its types, no larger than it takes.
const acceptsOf =
  (field: MediaField) =>
  (media: Media): boolean =>
    field.contentTypes.includes(media.contentType) &&
    media.byteSize <= field.maxByteSize;

// The library's picker, for one file the field takes.
const OptionMediaPicker = ({
  chosen,
  disabled,
  field,
  onValue,
  workspaceId,
}: {
  readonly chosen: boolean;
  readonly disabled: boolean;
  readonly field: MediaField;
  readonly onValue: (value: Value) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Posts.Options");

  return (
    <MediaPicker
      accepts={acceptsOf(field)}
      attached={[]}
      disabled={disabled}
      room={1}
      texts={{
        attach: t("mediaUse"),
        description: t("mediaPickerDescription"),
        // Named after the field: the attachments' picker is "Choose from
        // the library" too.
        open: chosen
          ? t("mediaReplace", { label: t(field.label) })
          : t("mediaChoose", { label: t(field.label) }),
        title: t("mediaPickerTitle", { label: t(field.label) }),
      }}
      workspaceId={workspaceId}
      onPick={(picked) => {
        const [first] = picked;

        if (first !== undefined) {
          onValue(first.id);
        }
      }}
    />
  );
};

// The file a field names, read from the library.
const HeldMedia = ({
  mediaId,
  workspaceId,
  ...props
}: FieldProps<MediaField> & {
  readonly mediaId: string;
  readonly workspaceId: string;
}) => {
  const result = useAtomValue(mediaItem(workspaceId, mediaId));

  const chosen: ChosenMedia = AsyncResult.match(result, {
    onFailure: (): ChosenMedia => ({ _tag: "failed" }),
    onInitial: (): ChosenMedia => ({ _tag: "loading" }),
    onSuccess: ({ value }): ChosenMedia => ({ _tag: "loaded", media: value }),
  });

  return (
    <MediaOptionView
      {...props}
      chosen={chosen}
      picker={
        <OptionMediaPicker
          chosen
          disabled={props.disabled}
          field={props.field}
          workspaceId={workspaceId}
          onValue={props.onValue}
        />
      }
      onRemove={() => {
        props.onValue(undefined);
      }}
    />
  );
};

// A field that names a file of the library. Without a workspace, it shows
// what it holds, with nothing to pick from.
const MediaInput = (props: FieldProps<MediaField>) => {
  const mediaId = textOf(props.value);
  const { workspaceId } = props;

  const handleRemove = () => {
    props.onValue(undefined);
  };

  if (workspaceId === undefined) {
    return (
      <MediaOptionView
        {...props}
        chosen={mediaId === "" ? { _tag: "none" } : { _tag: "loading" }}
        picker={null}
        onRemove={handleRemove}
      />
    );
  }

  if (mediaId !== "") {
    return <HeldMedia {...props} mediaId={mediaId} workspaceId={workspaceId} />;
  }

  return (
    <MediaOptionView
      {...props}
      chosen={{ _tag: "none" }}
      picker={
        <OptionMediaPicker
          chosen={false}
          disabled={props.disabled}
          field={props.field}
          workspaceId={workspaceId}
          onValue={props.onValue}
        />
      }
      onRemove={handleRemove}
    />
  );
};

const FieldInput = (props: FieldProps<OptionField>) =>
  Match.value(props.field).pipe(
    Match.discriminatorsExhaustive("kind")({
      choice: (field) => <ChoiceInput {...props} field={field} />,
      localTime: (field) => <TextInput {...props} field={field} />,
      lookup: (field) => <LookupInput {...props} field={field} />,
      media: (field) => <MediaInput {...props} field={field} />,
      mentions: (field) => <TextInput {...props} field={field} />,
      number: (field) => <NumberInput {...props} field={field} />,
      tags: (field) => <TextInput {...props} field={field} />,
      text: (field) => <TextInput {...props} field={field} />,
      toggle: (field) => <ToggleInput {...props} field={field} />,
      yesNo: (field) => <YesNoInput {...props} field={field} />,
    })
  );

interface ChannelOptionsProps {
  readonly channel: Channel;
  readonly disabled: boolean;
  /** The kinds of the post's media, which some fields follow. */
  readonly media?: PostMediaKinds;
  readonly onChange: (values: OptionValues) => void;
  readonly values: OptionValues;
  readonly violations: readonly ContentViolation[];
  /** The workspace, whose library a media field picks from. */
  readonly workspaceId?: string | undefined;
}

const unlimited: FieldLimits = {};

const noFields: ReadonlyMap<string, FieldLimits> = new Map();

const noLookups: ReadonlyMap<string, LookupSource> = new Map();

// Whether a field its platform's values show (`isShown`) is offered: a box
// under another only while that one is ticked; a lookup under another once
// that one has a value, and unless the account has nothing to choose there.
const isOffered = (
  field: OptionField,
  values: OptionValues,
  lookups: ReadonlyMap<string, LookupSource>
): boolean => {
  if (field.kind === "toggle") {
    return field.within === undefined || values[field.within] === true;
  }

  if (field.kind !== "lookup" || field.under === undefined) {
    return true;
  }

  const offered = lookups.get(field.name)?.choices;

  return (
    textOf(values[field.under]) !== "" &&
    !(
      offered?._tag === "loaded" &&
      offered.choices.length === 0 &&
      textOf(values[field.name]) === ""
    )
  );
};

// The fields of one channel's platform, filled in with its values, limited
// by its account when it says how (`limits`), with `header` above them and
// `footer` below.
const ChannelOptionsFields = ({
  channel,
  disabled,
  footer,
  header,
  media,
  onChange,
  limits,
  lookups,
  values,
  violations,
  workspaceId,
}: ChannelOptionsProps & {
  readonly footer?: ReactNode;
  readonly header?: ReactNode;
  readonly limits?: ReadonlyMap<string, FieldLimits>;
  /** What each field a lookup fills offers, by field. */
  readonly lookups?: ReadonlyMap<string, LookupSource>;
}) => {
  const limitsByField = limits ?? noFields;
  const lookupsByField = lookups ?? noLookups;
  const t = useTranslations("Posts.Options");
  const tPosts = useTranslations("Posts");
  const byField = violationsByField(violations, channel.id);
  const typed = problemsByField(channel.platform, values, media);
  const platform = tPosts("platform", { platform: channel.platform });

  const shown = fieldsOf(channel.platform).filter(
    (field) =>
      limitsByField.get(field.name)?.hidden !== true &&
      isShown(channel.platform, field, values, media) &&
      isOffered(field, values, lookupsByField)
  );

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">
        {t("legend", {
          channel: tPosts("Composer.channelDetail", {
            handle: channelName(channel),
            platform,
          }),
        })}
      </legend>
      <p className="text-muted-foreground text-xs">
        {t("description", { platform })}
      </p>
      {header}
      {shown.map((field) => (
        <div
          key={field.name}
          className={
            field.kind === "toggle" && field.within !== undefined
              ? "pl-6"
              : undefined
          }
        >
          <FieldInput
            disabled={disabled}
            field={field}
            limits={limitsByField.get(field.name) ?? unlimited}
            lookup={lookupsByField.get(field.name)}
            id={`option-${channel.id}-${field.name}`}
            value={values[field.name]}
            problem={Option.fromUndefinedOr(
              typed.get(field.name) ?? byField.get(field.name)
            ).pipe(
              Option.map((found) => problemOf(t, field, found)),
              Option.getOrUndefined
            )}
            workspaceId={workspaceId}
            onValue={(value) => {
              onChange(withValue(channel.platform, values, field.name, value));
            }}
          />
        </div>
      ))}
      {footer}
    </fieldset>
  );
};

/** What the composer knows of a TikTok channel's creator. */
export type TikTokAccountState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "failed"; readonly reason: TikTokFailure }
  | { readonly _tag: "loaded"; readonly account: TikTokAccount };

/** Why a creator's settings could not be read. */
export type TikTokFailure = "disabled" | "reconnect" | "unreachable";

// Who posts: their nickname, with their username when TikTok gives one.
const postingAs = (t: Translate, { nickname, username }: TikTokCreator) =>
  username === ""
    ? t("tiktok.postingAsNickname", { nickname })
    : t("tiktok.postingAs", { nickname, username });

// TikTok's policies the consent names, which its guidelines ask to link.
const tiktokPolicies = {
  brand: "https://www.tiktok.com/legal/page/global/bc-policy/en",
  music: "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en",
} as const;

const PolicyLink = ({
  children,
  href,
}: {
  readonly children: ReactNode;
  readonly href: string;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    className="underline underline-offset-4"
  >
    {children}
  </a>
);

// The consent's tags, each the policy it names.
const BrandedContentPolicy = (chunks: ReactNode) => (
  <PolicyLink href={tiktokPolicies.brand}>{chunks}</PolicyLink>
);

const MusicUsageConfirmation = (chunks: ReactNode) => (
  <PolicyLink href={tiktokPolicies.music}>{chunks}</PolicyLink>
);

// Who posts, or why the creator cannot post, or why TikTok could not say.
const CreatorNotice = ({ state }: { readonly state: TikTokAccountState }) => {
  const t = useTranslations("Posts.Options");

  const text = Match.valueTags(state, {
    failed: ({ reason }) => t("tiktok.creatorFailed", { reason }),
    loaded: ({ account: { posting } }) =>
      posting._tag === "blocked"
        ? t("tiktok.blocked", { reason: posting.reason })
        : postingAs(t, posting.creator),
    loading: () => t("tiktok.loadingCreator"),
  });

  return <output className="text-sm">{text}</output>;
};

// The disclosure's label, the consent TikTok asks for, and how long it
// takes to show.
const TikTokFooter = ({
  photos,
  limits,
  state,
}: {
  readonly photos: boolean;
  readonly limits: CreatorLimits;
  readonly state: TikTokAccountState;
}) => {
  const t = useTranslations("Posts.Options");
  const kind = photos ? "photo" : "video";

  const noPhotos =
    photos && state._tag === "loaded" && !state.account.takesPhotos;

  return (
    <div className="flex flex-col gap-2">
      {Option.isSome(limits.label) ? (
        <p className="text-sm">{t(limits.label.value, { kind })}</p>
      ) : null}
      {noPhotos ? (
        <p className="text-destructive-text text-xs">{t("tiktok.noPhotos")}</p>
      ) : null}
      <p className="text-muted-foreground text-xs">{t("tiktok.processing")}</p>
      <p className="text-sm">
        {t.rich(limits.consent, {
          brand: BrandedContentPolicy,
          music: MusicUsageConfirmation,
        })}
      </p>
    </div>
  );
};

/**
 * A TikTok channel's fields, limited by its creator as TikTok's content
 * sharing guidelines ask, once `state` says who they are.
 */
export const TikTokOptionsFields = ({
  photos,
  state,
  ...props
}: ChannelOptionsProps & {
  readonly photos: boolean;
  readonly state: TikTokAccountState;
}) => {
  const account =
    state._tag === "loaded" ? Option.some(state.account) : Option.none();

  const limits = creatorLimits(account, props.values, photos);

  return (
    <ChannelOptionsFields
      {...props}
      limits={limits.fields}
      header={<CreatorNotice state={state} />}
      footer={<TikTokFooter photos={photos} limits={limits} state={state} />}
    />
  );
};

const decodeCannotPost = Schema.decodeUnknownOption(
  Schema.Struct({
    _tag: Schema.Literal("ChannelCannotPost"),
    reason: Schema.Literals(["disabled", "reconnect"]),
  })
);

const failureOf = (cause: Cause.Cause<unknown>): TikTokFailure =>
  Cause.findErrorOption(cause).pipe(
    Option.flatMap(decodeCannotPost),
    Option.match({
      onNone: (): TikTokFailure => "unreachable",
      onSome: ({ reason }) => reason,
    })
  );

// A TikTok channel's fields, with its creator read from the API; the
// values follow what the creator's settings allow.
const TikTokChannelOptions = ({
  photos,
  workspaceId,
  ...props
}: ChannelOptionsProps & {
  readonly photos: boolean;
  readonly workspaceId: string;
}) => {
  const result = useAtomValue(tiktokCreator(workspaceId, props.channel.id));

  let state: TikTokAccountState = { _tag: "loading" };

  if (AsyncResult.isSuccess(result)) {
    state = { _tag: "loaded", account: result.value };
  } else if (AsyncResult.isFailure(result)) {
    state = { _tag: "failed", reason: failureOf(result.cause) };
  }

  const account =
    state._tag === "loaded" ? Option.some(state.account) : Option.none();

  const fitted = fittedToCreator(account, props.values);
  const { onChange } = props;

  useEffect(() => {
    if (fitted !== props.values) {
      onChange(fitted);
    }
  }, [fitted, props.values, onChange]);

  return (
    <TikTokOptionsFields
      {...props}
      photos={photos}
      state={state}
      workspaceId={workspaceId}
    />
  );
};

/**
 * A Pinterest channel's fields, its board and section chosen among those
 * `boards` and `sections` say the account has.
 */
export const PinterestOptionsFields = ({
  boards,
  sections,
  ...props
}: ChannelOptionsProps & {
  readonly boards: LookupSource;
  readonly sections: LookupSource;
}) => (
  <ChannelOptionsFields
    {...props}
    lookups={
      new Map([
        ["boardId", boards],
        ["boardSectionId", sections],
      ])
    }
  />
);

// A Pinterest channel's fields, with its boards read from the API, and
// the sections of the board chosen.
const PinterestChannelOptions = ({
  workspaceId,
  ...props
}: ChannelOptionsProps & { readonly workspaceId: string }) => {
  const boards = pinterestBoards(workspaceId, props.channel.id);

  const sections = pinterestBoardSections(
    workspaceId,
    props.channel.id,
    textOf(props.values["boardId"])
  );

  return (
    <PinterestOptionsFields
      {...props}
      workspaceId={workspaceId}
      boards={{
        choices: choicesOf(useAtomValue(boards), ({ id, name }) => ({
          label: name,
          value: id,
        })),
        retry: useAtomRefresh(boards),
      }}
      sections={{
        choices: choicesOf(useAtomValue(sections), ({ id, name }) => ({
          label: name,
          value: id,
        })),
        retry: useAtomRefresh(sections),
      }}
    />
  );
};

/**
 * A Bluesky channel's fields, its gates closed where `standing` says the
 * channel must be reconnected to set them.
 */
export const BlueskyOptionsFields = ({
  standing,
  ...props
}: ChannelOptionsProps & {
  readonly standing: Option.Option<AccountStanding>;
}) => (
  <ChannelOptionsFields
    {...props}
    limits={blueskyLimits(standing, props.values)}
  />
);

// A Bluesky channel's fields, with its account's standing read from the
// channel's capabilities; until it is read, nothing is closed, and
// scheduling checks it.
const BlueskyChannelOptions = ({
  workspaceId,
  ...props
}: ChannelOptionsProps & { readonly workspaceId: string }) => {
  const result = useAtomValue(
    channelCapabilities(workspaceId, props.channel.id)
  );

  return (
    <BlueskyOptionsFields
      {...props}
      workspaceId={workspaceId}
      standing={
        AsyncResult.isSuccess(result)
          ? Option.some(result.value.account)
          : Option.none()
      }
    />
  );
};

const loadingLookup: LookupSource = { choices: { _tag: "loading" } };

interface TargetOptionsPanelProps {
  /** The channels the post goes to; those whose platform takes options show. */
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
  /**
   * The kinds of the post's media, which some fields follow (a reel's on
   * one video); every field shows while they are unknown.
   */
  readonly media?: PostMediaKinds;
  /** Whether the post shows photos only, which TikTok posts as photos. */
  readonly photos?: boolean;
  /**
   * The workspace, whose TikTok channels' creators and Pinterest channels'
   * boards are read from the API; without it, they show without them.
   */
  readonly workspaceId?: string;
  readonly onChange: (channelId: string, values: OptionValues) => void;
  /** What each channel's fields hold, by channel. */
  readonly valuesOf: (channel: Channel) => OptionValues;
  /** What the last schedule refused, which each field shows. */
  readonly violations: readonly ContentViolation[];
}

// Whether the platform has fields for a post of these media.
const hasFieldsFor = ({ platform }: Channel, media: PostMediaKinds): boolean =>
  fieldsOf(platform).some(
    ({ shownFor }) =>
      shownFor === undefined ||
      media === undefined ||
      matchesMedia(shownFor, media)
  );

/**
 * Whether any of the channels' platforms takes options on a post of these
 * media (any, while they are unknown).
 */
export const takesOptions = (
  channels: readonly Channel[],
  media?: PostMediaKinds
): boolean => channels.some((channel) => hasFieldsFor(channel, media));

// The options of each selected channel whose platform takes some, as its
// platform's fields describe them, with what the last schedule refused in
// them under each field.
export const TargetOptionsPanel = ({
  channels,
  disabled,
  media,
  onChange,
  photos = false,
  valuesOf,
  violations,
  workspaceId,
}: TargetOptionsPanelProps) => (
  <div className="flex flex-col gap-4">
    {channels
      .filter((channel) => hasFieldsFor(channel, media))
      .map((channel) => {
        const props: ChannelOptionsProps = {
          channel,
          disabled,
          media,
          onChange: (values) => {
            onChange(channel.id, values);
          },
          values: valuesOf(channel),
          violations,
          workspaceId,
        };

        if (channel.platform === "pinterest") {
          return workspaceId === undefined ? (
            <PinterestOptionsFields
              key={channel.id}
              {...props}
              boards={loadingLookup}
              sections={loadingLookup}
            />
          ) : (
            <PinterestChannelOptions
              key={channel.id}
              {...props}
              workspaceId={workspaceId}
            />
          );
        }

        if (channel.platform === "bluesky" && workspaceId !== undefined) {
          return (
            <BlueskyChannelOptions
              key={channel.id}
              {...props}
              workspaceId={workspaceId}
            />
          );
        }

        if (channel.platform !== "tiktok") {
          return <ChannelOptionsFields key={channel.id} {...props} />;
        }

        return workspaceId === undefined ? (
          <TikTokOptionsFields
            key={channel.id}
            {...props}
            photos={photos}
            state={{ _tag: "loading" }}
          />
        ) : (
          <TikTokChannelOptions
            key={channel.id}
            {...props}
            photos={photos}
            workspaceId={workspaceId}
          />
        );
      })}
  </div>
);

const noViolations: readonly ContentViolation[] = [];

interface TargetOptionsSectionProps extends Omit<
  TargetOptionsPanelProps,
  "violations"
> {
  /** The composer's last failure, whose violations the fields show. */
  readonly failure: ComposerFailure | null;
}

// The composer's section of options, after a separator, when one of the
// channels' platforms takes some.
export const TargetOptionsSection = ({
  failure,
  ...panel
}: TargetOptionsSectionProps) => {
  const t = useTranslations("Posts.Options");

  if (!takesOptions(panel.channels, panel.media)) {
    return null;
  }

  // Something filled in the API would refuse, which nothing sends.
  const wrong = panel.channels.some(
    (channel) =>
      problemsByField(channel.platform, panel.valuesOf(channel), panel.media)
        .size > 0
  );

  return (
    <>
      <Separator />
      <section aria-labelledby="options-title" className="flex flex-col gap-3">
        <h2 id="options-title" className="text-sm font-medium">
          {t("section")}
        </h2>
        {wrong ? (
          <output className="text-destructive-text text-sm">
            {t("fixToSend")}
          </output>
        ) : null}
        <TargetOptionsPanel
          {...panel}
          violations={
            failure?._tag === "PostContentInvalid"
              ? failure.violations
              : noViolations
          }
        />
      </section>
    </>
  );
};
