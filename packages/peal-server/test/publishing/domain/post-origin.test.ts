import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "@effect/vitest";
import { DateTime, Option, Result, Schema } from "effect";

import { emptyContent } from "#publishing/domain/post-content.ts";
import {
  originOf,
  PostAttribution,
  PostOriginSchema,
} from "#publishing/domain/post-origin.ts";
import {
  createDraft,
  editDraft,
  moveToDraft,
  scheduledThrough,
  schedulePost,
} from "#publishing/domain/post.ts";
import { Schedule } from "#publishing/domain/schedule.ts";
import { Actor } from "#shared/domain/access.ts";
import {
  PostIdSchema,
  UserIdSchema,
  WorkspaceIdSchema,
} from "#shared/domain/ids.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const postId = PostIdSchema.make("00000000-0000-7000-8000-000000000001");

const workspaceId = WorkspaceIdSchema.make(
  "00000000-0000-7000-8000-000000000002"
);

const userId = UserIdSchema.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");

const now = DateTime.makeUnsafe("2026-06-15T07:00:00Z");

const inAnHour = new Schedule({
  at: DateTime.makeUnsafe("2026-06-15T08:00:00Z"),
  timeZone: TimeZoneIdSchema.make("Europe/Paris"),
});

const permissions = permissionsFor("owner");

const inSession = new Actor({
  permissions,
  subject: { _tag: "user", impersonatedBy: Option.none(), userId },
  workspaceId,
});

const throughClient = new Actor({
  permissions,
  subject: {
    _tag: "user",
    clientId: "synthetic-client",
    impersonatedBy: Option.none(),
    userId,
  },
  workspaceId,
});

const withKey = new Actor({
  permissions,
  subject: { _tag: "apiKey", apiKeyId: "synthetic-key" },
  workspaceId,
});

describe(originOf, () => {
  it("is the web app for a member in their session", () => {
    expect(originOf(inSession, Option.none())).toStrictEqual({ _tag: "web" });
  });

  it("is the application an OAuth client acts as, with its name", () => {
    expect(
      originOf(throughClient, Option.some("Synthetic agent"))
    ).toStrictEqual({
      _tag: "application",
      clientId: "synthetic-client",
      name: "Synthetic agent",
    });
    expect(originOf(throughClient, Option.none())).toStrictEqual({
      _tag: "application",
      clientId: "synthetic-client",
    });
  });

  it("is the API key, with its name", () => {
    expect(originOf(withKey, Option.some("Importer"))).toStrictEqual({
      _tag: "apiKey",
      apiKeyId: "synthetic-key",
      name: "Importer",
    });
  });
});

describe("a post's attribution", () => {
  const via = originOf(throughClient, Option.some("Synthetic agent"));

  const draft = createDraft(
    postId,
    workspaceId,
    emptyContent,
    Option.some(userId),
    Option.some(via)
  );

  it("keeps how the post was created, through edits and schedules", () => {
    expect(draft.attribution.createdVia).toStrictEqual(Option.some(via));
    expect(draft.attribution.scheduledVia).toStrictEqual(Option.none());

    const edited = Result.getOrThrow(editDraft(draft, emptyContent));

    expect(edited.attribution).toStrictEqual(draft.attribution);

    const scheduled = Result.getOrThrow(schedulePost(draft, inAnHour, now));

    expect(scheduled.attribution).toStrictEqual(draft.attribution);
  });

  it("says who scheduled it and how, until it is a draft again", () => {
    const scheduled = scheduledThrough(
      Result.getOrThrow(schedulePost(draft, inAnHour, now)),
      { _tag: "web" },
      Option.some(userId)
    );

    expect(scheduled.attribution).toStrictEqual(
      new PostAttribution({
        createdVia: Option.some(via),
        scheduledBy: Option.some(userId),
        scheduledVia: Option.some({ _tag: "web" }),
      })
    );

    const back = Result.getOrThrow(moveToDraft(scheduled));

    expect(back.attribution).toStrictEqual(draft.attribution);
  });

  it("is unknown on a post from before it was kept", () => {
    const old = createDraft(postId, workspaceId, emptyContent, Option.none());

    expect(old.attribution).toStrictEqual(PostAttribution.unknown);
  });
});

// Origins are stored with posts (`publishing.posts.created_via` and
// `scheduled_via`): they are persisted contract. Keep the fixture decoding,
// and add to it when a way to reach Peal is added.
describe("a stored origin", () => {
  it("decodes as this release writes it", async () => {
    const stored = await readFile(
      path.join(
        import.meta.dirname,
        "..",
        "infrastructure",
        "fixtures",
        "persisted",
        "posts",
        "origins.json"
      ),
      "utf-8"
    );

    const origins = Schema.decodeUnknownSync(
      Schema.fromJsonString(Schema.Array(PostOriginSchema))
    )(stored);

    expect(origins.map(({ _tag }) => _tag)).toStrictEqual([
      "web",
      "apiKey",
      "apiKey",
      "application",
      "application",
    ]);
    expect(originOf(withKey, Option.none())).toStrictEqual({
      _tag: "apiKey",
      apiKeyId: "synthetic-key",
    });
  });
});
