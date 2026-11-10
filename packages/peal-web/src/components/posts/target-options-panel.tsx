"use client";

import { useAtomValue } from "@effect/atom-react";
import { Cause, Match, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type {
  Channel,
  ContentViolation,
  TikTokAccount,
  TikTokCreator,
} from "peal-contract";
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
import { useEffect } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { tiktokCreator } from "#posts/api.ts";
import type { ComposerFailure } from "#posts/composer-failure.ts";
import {
  fieldsOf,
  violationsByField,
  withValue,
} from "#posts/target-options.ts";
import type {
  ChoiceField,
  OptionField,
  OptionValues,
  OptionViolation,
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

interface FieldProps<F extends OptionField> {
  readonly disabled: boolean;
  readonly field: F;
  /** How the account shows it, when its platform says (TikTok's creator). */
  readonly limits: FieldLimits;
  readonly id: string;
  readonly onValue: (value: Value) => void;
  readonly value: Value;
  readonly violation: OptionViolation | undefined;
}

// What is wrong with the field's value, as the last schedule found it.
const problemOf = (
  t: Translate,
  field: OptionField,
  violation: OptionViolation
): string =>
  Match.valueTags(violation, {
    optionInvalid: () =>
      field.invalid === undefined ? t("invalid") : t(field.invalid),
    optionMissing: () => t("missing"),
    optionTooLong: ({ length, maximum }) => t("tooLong", { length, maximum }),
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
  violation,
}: {
  readonly field: OptionField;
  readonly id: string;
  readonly limits: FieldLimits;
  readonly violation: OptionViolation | undefined;
}) => {
  const t = useTranslations("Posts.Options");
  const closed = [...(limits.closedChoices?.values() ?? [])];

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
      {violation === undefined ? null : (
        <p id={`${id}-error`} className="text-destructive-text text-xs">
          {problemOf(t, field, violation)}
        </p>
      )}
    </>
  );
};

const describedBy = (
  field: OptionField,
  id: string,
  violation: OptionViolation | undefined
): string | undefined => {
  const ids = [
    ...(field.hint === undefined ? [] : [`${id}-hint`]),
    ...(violation === undefined ? [] : [`${id}-error`]),
  ];

  return ids.length === 0 ? undefined : ids.join(" ");
};

const TextInput = ({
  disabled,
  field,
  id,
  onValue,
  limits,
  value,
  violation,
}: FieldProps<MentionsField | TagsField | TextField>) => {
  const t = useTranslations("Posts.Options");

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onValue(event.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{labelOf(t, field)}</Label>
      <Input
        id={id}
        type="text"
        autoComplete="off"
        disabled={disabled}
        value={textOf(value)}
        aria-invalid={violation !== undefined}
        aria-describedby={describedBy(field, id, violation)}
        onChange={handleChange}
      />
      <Notes field={field} id={id} limits={limits} violation={violation} />
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
  violation,
}: {
  readonly choices: readonly Choice[];
  readonly disabled: boolean;
  readonly field: OptionField;
  readonly id: string;
  readonly onChoice: (value: string) => void;
  readonly selected: string | undefined;
  readonly limits: FieldLimits;
  readonly violation: OptionViolation | undefined;
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
          aria-invalid={violation !== undefined}
          aria-describedby={describedBy(field, id, violation)}
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
      <Notes field={field} id={id} limits={limits} violation={violation} />
    </div>
  );
};

const ChoiceInput = ({
  field,
  onValue,
  value,
  ...rest
}: FieldProps<ChoiceField>) => {
  const t = useTranslations("Posts.Options");

  return (
    <ChoiceSelect
      {...rest}
      field={field}
      choices={field.choices
        .filter(
          ({ value: offered }) =>
            rest.limits.choices === undefined ||
            rest.limits.choices.has(offered)
        )
        .map((choice) => ({
          closed: rest.limits.closedChoices?.has(choice.value) ?? false,
          label: t(choice.label),
          value: choice.value,
        }))}
      selected={Option.getOrUndefined(decodeText(value))}
      onChoice={onValue}
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
  value,
  violation,
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
          aria-invalid={violation !== undefined}
          aria-describedby={describedBy(field, id, violation)}
          onCheckedChange={(ticked) => {
            onValue(field.inverted === true ? !ticked : ticked);
          }}
        />
        <Label htmlFor={id}>{t(field.label)}</Label>
      </div>
      <div className="pl-6">
        <Notes field={field} id={id} limits={limits} violation={violation} />
      </div>
    </div>
  );
};

const FieldInput = (props: FieldProps<OptionField>) =>
  Match.value(props.field).pipe(
    Match.discriminatorsExhaustive("kind")({
      choice: (field) => <ChoiceInput {...props} field={field} />,
      mentions: (field) => <TextInput {...props} field={field} />,
      tags: (field) => <TextInput {...props} field={field} />,
      text: (field) => <TextInput {...props} field={field} />,
      toggle: (field) => <ToggleInput {...props} field={field} />,
      yesNo: (field) => <YesNoInput {...props} field={field} />,
    })
  );

interface ChannelOptionsProps {
  readonly channel: Channel;
  readonly disabled: boolean;
  readonly onChange: (values: OptionValues) => void;
  readonly values: OptionValues;
  readonly violations: readonly ContentViolation[];
}

const unlimited: FieldLimits = {};

const noFields: ReadonlyMap<string, FieldLimits> = new Map();

// The fields of one channel's platform, filled in with its values, limited
// by its account when it says how (`limits`), with `header` above them and
// `footer` below.
const ChannelOptionsFields = ({
  channel,
  disabled,
  footer,
  header,
  onChange,
  limits,
  values,
  violations,
}: ChannelOptionsProps & {
  readonly footer?: ReactNode;
  readonly header?: ReactNode;
  readonly limits?: ReadonlyMap<string, FieldLimits>;
}) => {
  const limitsByField = limits ?? noFields;
  const t = useTranslations("Posts.Options");
  const tPosts = useTranslations("Posts");
  const byField = violationsByField(violations, channel.id);
  const platform = tPosts("platform", { platform: channel.platform });

  const shown = fieldsOf(channel.platform).filter(
    (field) =>
      limitsByField.get(field.name)?.hidden !== true &&
      (field.kind !== "toggle" ||
        field.within === undefined ||
        values[field.within] === true)
  );

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border p-4">
      <legend className="px-1 text-sm font-medium">
        {t("legend", {
          channel: tPosts("Composer.channelDetail", {
            handle: channel.handle,
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
            id={`option-${channel.id}-${field.name}`}
            value={values[field.name]}
            violation={byField.get(field.name)}
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

  return <TikTokOptionsFields {...props} photos={photos} state={state} />;
};

interface TargetOptionsPanelProps {
  /** The channels the post goes to; those whose platform takes options show. */
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
  /** Whether the post shows photos only, which TikTok posts as photos. */
  readonly photos?: boolean;
  /**
   * The workspace, whose TikTok channels' creators are read from the API;
   * without it, they show without them.
   */
  readonly workspaceId?: string;
  readonly onChange: (channelId: string, values: OptionValues) => void;
  /** What each channel's fields hold, by channel. */
  readonly valuesOf: (channel: Channel) => OptionValues;
  /** What the last schedule refused, which each field shows. */
  readonly violations: readonly ContentViolation[];
}

/** Whether any of the channels' platforms takes options. */
export const takesOptions = (channels: readonly Channel[]): boolean =>
  channels.some(({ platform }) => fieldsOf(platform).length > 0);

// The options of each selected channel whose platform takes some, as its
// platform's fields describe them, with what the last schedule refused in
// them under each field.
export const TargetOptionsPanel = ({
  channels,
  disabled,
  onChange,
  photos = false,
  valuesOf,
  violations,
  workspaceId,
}: TargetOptionsPanelProps) => (
  <div className="flex flex-col gap-4">
    {channels
      .filter(({ platform }) => fieldsOf(platform).length > 0)
      .map((channel) => {
        const props: ChannelOptionsProps = {
          channel,
          disabled,
          onChange: (values) => {
            onChange(channel.id, values);
          },
          values: valuesOf(channel),
          violations,
        };

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

  if (!takesOptions(panel.channels)) {
    return null;
  }

  return (
    <>
      <Separator />
      <section aria-labelledby="options-title" className="flex flex-col gap-3">
        <h2 id="options-title" className="text-sm font-medium">
          {t("section")}
        </h2>
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
