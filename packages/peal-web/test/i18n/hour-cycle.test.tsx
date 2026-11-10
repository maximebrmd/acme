import { describe, expect, it } from "@effect/vitest";
import {
  NextIntlClientProvider,
  useFormatter,
  useTranslations,
} from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";

import { TimeFormatFields } from "#components/account/time-format-form.tsx";
import {
  InHourFormat,
  ViewerHourCycle,
} from "#components/viewer-hour-cycle.tsx";
import {
  hourFormatOf,
  timeFormatsOf,
  timeOptionsOf,
  useTimeOptions,
} from "#i18n/hour-cycle.ts";
import type { HourFormat } from "#i18n/hour-cycle.ts";
import { loadMessages } from "#i18n/messages.ts";

const afternoon = new Date("2026-11-10T14:30:00Z");

// A time written by a message, and one written by the formatter with the
// viewer's options, as the calendar and the composer do.
const Times = () => {
  const t = useTranslations("PostDetail");
  const format = useFormatter();
  const options = useTimeOptions();

  return (
    <p>
      {t("scheduledFor", { at: afternoon })}
      {" | "}
      {format.dateTime(afternoon, { timeStyle: "short", ...options })}
    </p>
  );
};

const noop = () => {
  // Nothing changes while rendering to markup.
};

const render = async (locale: "en" | "fr", format: HourFormat) =>
  renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={await loadMessages(locale)}
      timeZone="UTC"
    >
      <InHourFormat format={format}>
        <Times />
      </InHourFormat>
    </NextIntlClientProvider>
  );

describe(hourFormatOf, () => {
  it.each(["auto", "h12", "h24"] as const)("reads %s", (stored) => {
    expect(hourFormatOf(stored)).toBe(stored);
  });

  it.each([null, "", "h23", "24", "H24", '"h24"'])(
    "falls back to the language's clock for %o",
    (stored) => {
      expect(hourFormatOf(stored)).toBe("auto");
    }
  );
});

describe(timeOptionsOf, () => {
  it("adds nothing for the language's clock, and an hour cycle otherwise", () => {
    expect(timeOptionsOf("auto")).toStrictEqual({});
    expect(timeOptionsOf("h12")).toStrictEqual({ hourCycle: "h12" });
    expect(timeOptionsOf("h24")).toStrictEqual({ hourCycle: "h23" });
  });
});

describe(timeFormatsOf, () => {
  it("leaves the messages' own format for the language's clock", () => {
    expect(timeFormatsOf("auto")).toBeUndefined();
  });

  it("gives the messages' short time the clock chosen", () => {
    expect(timeFormatsOf("h24")).toStrictEqual({
      dateTime: {
        short: { hour: "numeric", hourCycle: "h23", minute: "numeric" },
      },
    });
  });
});

describe(InHourFormat, () => {
  it("writes the language's clock for the automatic format", async () => {
    await expect(render("en", "auto")).resolves.toContain("at 2:30 PM");
    await expect(render("fr", "auto")).resolves.toContain("à 14:30");
  });

  it("writes a 24-hour clock in a language that has a 12-hour one", async () => {
    // The formatter's own time follows the browser's preference, which a
    // render on the server does not have.
    await expect(render("en", "h24")).resolves.toContain("at 14:30 | 2:30 PM");
  });

  it("writes a 12-hour clock in a language that has a 24-hour one", async () => {
    await expect(render("fr", "h12")).resolves.toContain("à 2:30 PM");
  });
});

describe(ViewerHourCycle, () => {
  it("renders the language's clock on the server, whatever the browser keeps", async () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en"
        messages={await loadMessages("en")}
        timeZone="UTC"
      >
        <ViewerHourCycle>
          <Times />
        </ViewerHourCycle>
      </NextIntlClientProvider>
    );

    expect(html).toContain("at 2:30 PM | 2:30 PM");
  });
});

describe(TimeFormatFields, () => {
  it("offers the three formats, each with the same time as an example", async () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en"
        messages={await loadMessages("en")}
        timeZone="UTC"
      >
        <TimeFormatFields value="h24" onChange={noop} />
      </NextIntlClientProvider>
    );

    expect(html.match(/type="radio"/gu)).toHaveLength(3);
    expect(html).toContain("Automatic, as your language writes it (2:30 PM)");
    expect(html).toContain("12-hour (2:30 PM)");
    expect(html).toContain("24-hour (14:30)");
    expect(html).toMatch(/id="[^"]*-h24"[^>]*checked=""/u);
  });

  it("writes the examples in French", async () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="fr"
        messages={await loadMessages("fr")}
        timeZone="UTC"
      >
        <TimeFormatFields value="auto" onChange={noop} />
      </NextIntlClientProvider>
    );

    expect(html).toContain("Automatique, comme votre langue l’écrit (14:30)");
    expect(html).toMatch(/12 heures \(0?2:30\sPM\)/u);
    expect(html).toContain("24 heures (14:30)");
  });
});
