import { Option, Schema } from "effect";
import enData from "emojibase-data/en/data.json" with { type: "json" };
import enMessages from "emojibase-data/en/messages.json" with { type: "json" };
import frData from "emojibase-data/fr/data.json" with { type: "json" };
import frMessages from "emojibase-data/fr/messages.json" with { type: "json" };

import { emojiFiles } from "#emoji/emoji-data.ts";
import { routing } from "#i18n/routing.ts";

// The emoji picker's data, from the emojibase-data package this app
// installs, in each of its languages: served from the app's own origin, so
// no visitor's address goes to another host for it, and a self-hosted
// server needs none. Rendered once at build time, like a static file.

export const dynamic = "force-static";

export const dynamicParams = false;

const served = {
  en: { "data.json": enData, "messages.json": enMessages },
  fr: { "data.json": frData, "messages.json": frMessages },
};

const ParamsSchema = Schema.Struct({
  file: Schema.Literals(emojiFiles),
  locale: Schema.Literals(routing.locales),
});

export const generateStaticParams = () =>
  routing.locales.flatMap((locale) =>
    emojiFiles.map((file) => ({ file, locale }))
  );

export const GET = async (
  _request: Request,
  { params }: RouteContext<"/emoji-data/[locale]/[file]">
) =>
  Option.match(Schema.decodeUnknownOption(ParamsSchema)(await params), {
    onNone: () => new Response(null, { status: 404 }),
    onSome: ({ file, locale }) => Response.json(served[locale][file]),
  });
