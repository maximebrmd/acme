"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useId } from "react";

import {
  HourFormatSchema,
  saveHourFormat,
  timeOptionsOf,
  useHourFormat,
} from "#i18n/hour-cycle.ts";
import type { HourFormat } from "#i18n/hour-cycle.ts";

// An afternoon time, which the two clocks write differently.
const example = Date.UTC(2000, 0, 1, 14, 30);

/** The three ways to write a time, each with an example. */
export const TimeFormatFields = ({
  onChange,
  value,
}: {
  readonly onChange: (format: HourFormat) => void;
  readonly value: HourFormat;
}) => {
  const t = useTranslations("AccountSettings.timeFormat");
  const format = useFormatter();
  const name = useId();

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium">{t("legend")}</legend>
      {HourFormatSchema.literals.map((option) => {
        const id = `${name}-${option}`;

        return (
          <div key={option} className="flex items-center gap-2">
            <input
              id={id}
              type="radio"
              name={name}
              className="accent-primary"
              checked={value === option}
              onChange={() => {
                onChange(option);
              }}
            />
            <label htmlFor={id} className="text-sm">
              {t("option", {
                example: format.dateTime(example, {
                  timeStyle: "short",
                  timeZone: "UTC",
                  ...timeOptionsOf(option),
                }),
                format: option,
              })}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
};

/**
 * How this browser writes times of day: as the language does, on a 12-hour
 * clock or on a 24-hour one. The choice applies at once, and stays in this
 * browser.
 */
export const TimeFormatForm = () => (
  <TimeFormatFields value={useHourFormat()} onChange={saveHourFormat} />
);
