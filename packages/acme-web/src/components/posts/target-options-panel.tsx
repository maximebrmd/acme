"use client";

import type { Channel, ContentViolation } from "acme-contract";
import { Checkbox } from "acme-ui/components/checkbox";
import { Input } from "acme-ui/components/input";
import { Label } from "acme-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "acme-ui/components/select";
import { Separator } from "acme-ui/components/separator";
import { Match, Option, Schema } from "effect";
import { useTranslations } from "next-intl";
import type { ChangeEvent } from "react";

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
  TextField,
  ToggleField,
  YesNoField,
} from "#posts/target-options.ts";

type Translate = ReturnType<typeof useTranslations<"Posts.Options">>;

type Value = boolean | string | undefined;

const decodeText = Schema.decodeUnknownOption(Schema.String);

// A text field's value; nothing typed yet is the empty string.
const textOf = (value: Value): string =>
  decodeText(value).pipe(Option.getOrElse(() => ""));

interface FieldProps<F extends OptionField> {
  readonly disabled: boolean;
  readonly field: F;
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
  violation,
}: {
  readonly field: OptionField;
  readonly id: string;
  readonly violation: OptionViolation | undefined;
}) => {
  const t = useTranslations("Posts.Options");

  return (
    <>
      {field.hint === undefined ? null : (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {t(field.hint)}
        </p>
      )}
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
  value,
  violation,
}: FieldProps<TagsField | TextField>) => {
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
      <Notes field={field} id={id} violation={violation} />
    </div>
  );
};

interface Choice {
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
  violation,
}: {
  readonly choices: readonly Choice[];
  readonly disabled: boolean;
  readonly field: OptionField;
  readonly id: string;
  readonly onChoice: (value: string) => void;
  readonly selected: string | undefined;
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

          if (picked !== undefined) {
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
          {choices.map(({ label, value }) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Notes field={field} id={id} violation={violation} />
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
      choices={field.choices.map((choice) => ({
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
        { label: t(field.yes), value: yes },
        { label: t(field.no), value: no },
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
  value,
  violation,
}: FieldProps<ToggleField>) => {
  const t = useTranslations("Posts.Options");
  const checked = field.inverted === true ? value === false : value === true;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id={id}
          checked={checked}
          disabled={disabled}
          aria-invalid={violation !== undefined}
          aria-describedby={describedBy(field, id, violation)}
          onCheckedChange={(ticked) => {
            onValue(field.inverted === true ? !ticked : ticked);
          }}
        />
        <Label htmlFor={id}>{t(field.label)}</Label>
      </div>
      <div className="pl-6">
        <Notes field={field} id={id} violation={violation} />
      </div>
    </div>
  );
};

const FieldInput = (props: FieldProps<OptionField>) =>
  Match.value(props.field).pipe(
    Match.discriminatorsExhaustive("kind")({
      choice: (field) => <ChoiceInput {...props} field={field} />,
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

// The fields of one channel's platform, filled in with its values.
const ChannelOptionsFields = ({
  channel,
  disabled,
  onChange,
  values,
  violations,
}: ChannelOptionsProps) => {
  const t = useTranslations("Posts.Options");
  const tPosts = useTranslations("Posts");
  const byField = violationsByField(violations, channel.id);
  const platform = tPosts("platform", { platform: channel.platform });

  const shown = fieldsOf(channel.platform).filter(
    (field) =>
      field.kind !== "toggle" ||
      field.within === undefined ||
      values[field.within] === true
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
            id={`option-${channel.id}-${field.name}`}
            value={values[field.name]}
            violation={byField.get(field.name)}
            onValue={(value) => {
              onChange(withValue(channel.platform, values, field.name, value));
            }}
          />
        </div>
      ))}
    </fieldset>
  );
};

interface TargetOptionsPanelProps {
  /** The channels the post goes to; those whose platform takes options show. */
  readonly channels: readonly Channel[];
  readonly disabled: boolean;
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
  valuesOf,
  violations,
}: TargetOptionsPanelProps) => (
  <div className="flex flex-col gap-4">
    {channels
      .filter(({ platform }) => fieldsOf(platform).length > 0)
      .map((channel) => (
        <ChannelOptionsFields
          key={channel.id}
          channel={channel}
          disabled={disabled}
          values={valuesOf(channel)}
          violations={violations}
          onChange={(values) => {
            onChange(channel.id, values);
          }}
        />
      ))}
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
