"use client";

import { Button } from "acme-ui/components/button";
import { Calendar } from "acme-ui/components/calendar";
import { Input } from "acme-ui/components/input";
import { Label } from "acme-ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "acme-ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "acme-ui/components/select";
import { DateTime, Option } from "effect";
import { CalendarIcon } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { enUS, fr } from "react-day-picker/locale";

import {
  browserTimeZone,
  firstDayOfWeek,
  instantOf,
  parseTime,
  timeZoneChoices,
} from "#posts/zoned-time.ts";
import type { CalendarDate } from "#posts/zoned-time.ts";

/** A date, a time and the zone they are read in, as the user picks them. */
export interface ScheduleChoice {
  readonly date: CalendarDate;
  readonly time: string;
  readonly timeZone: string;
}

/** The instant a choice names, if it names one. */
export const instantOfChoice = ({ date, time, timeZone }: ScheduleChoice) =>
  parseTime(time).pipe(
    Option.flatMap((clock) => instantOf({ date, time: clock }, timeZone))
  );

const dayPickerLocales = { en: enUS, fr } as const;

// The day picker works on dates of the browser's own calendar.
const toPickerDate = ({ day, month, year }: CalendarDate) =>
  new Date(year, month - 1, day);

const fromPickerDate = (date: Date): CalendarDate => ({
  day: date.getDate(),
  month: date.getMonth() + 1,
  year: date.getFullYear(),
});

const zoneLabel = (zone: string) => zone.replaceAll("_", " ");

interface ScheduleFieldsProps {
  readonly disabled: boolean;
  readonly onChange: (choice: ScheduleChoice) => void;
  readonly value: ScheduleChoice;
}

// When a post goes out: a date from a calendar, a time, and the time zone
// they are read in, the browser's unless the user picks another.
export const ScheduleFields = ({
  disabled,
  onChange,
  value,
}: ScheduleFieldsProps) => {
  const t = useTranslations("Posts.Composer");
  const format = useFormatter();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const zones = useMemo(
    () => timeZoneChoices(browserTimeZone(), value.timeZone),
    [value.timeZone]
  );

  const at = instantOfChoice(value);

  const dateLabel = format.dateTime(
    Date.UTC(value.date.year, value.date.month - 1, value.date.day),
    { dateStyle: "medium", timeZone: "UTC" }
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label id="schedule-date-label">{t("dateLabel")}</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              disabled={disabled}
              aria-labelledby="schedule-date-label schedule-date"
              render={
                <Button id="schedule-date" variant="outline">
                  <CalendarIcon data-icon="inline-start" />
                  {dateLabel}
                </Button>
              }
            />
            <PopoverContent align="start">
              <Calendar
                mode="single"
                locale={dayPickerLocales[locale]}
                weekStartsOn={firstDayOfWeek(locale) === 7 ? 0 : 1}
                selected={toPickerDate(value.date)}
                defaultMonth={toPickerDate(value.date)}
                onSelect={(picked) => {
                  if (picked !== undefined) {
                    onChange({ ...value, date: fromPickerDate(picked) });
                    setOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="schedule-time">{t("timeLabel")}</Label>
          <Input
            id="schedule-time"
            type="time"
            value={value.time}
            disabled={disabled}
            required
            onChange={(event) => {
              onChange({ ...value, time: event.target.value });
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label id="schedule-zone-label">{t("timeZoneLabel")}</Label>
          <Select
            value={value.timeZone}
            disabled={disabled}
            onValueChange={(zone) => {
              if (zone !== null) {
                onChange({ ...value, timeZone: zone });
              }
            }}
          >
            <SelectTrigger aria-labelledby="schedule-zone-label">
              <SelectValue>{zoneLabel(value.timeZone)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zoneLabel(zone)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-muted-foreground text-sm" aria-live="polite">
        {Option.match(at, {
          onNone: () => t("invalidTime"),
          onSome: (instant) =>
            t("scheduleAt", {
              at: format.dateTime(DateTime.toDate(instant), {
                dateStyle: "full",
                timeStyle: "short",
                timeZone: value.timeZone,
              }),
            }),
        })}
      </p>
    </div>
  );
};
