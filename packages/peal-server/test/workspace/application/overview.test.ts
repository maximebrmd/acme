import { assert, describe, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";

import { PostIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import type { Platform } from "#shared/domain/platform.ts";
import { TimeZoneIdSchema } from "#shared/domain/time-zone.ts";
import {
  alpha,
  at,
  bravo,
  charlie,
  figures,
  firstPage,
  noCalls,
  overviewOver,
  person,
  reportDays,
  staffId,
  userId,
} from "#test/workspace/fakes/overview-fakes.ts";
import type { AgendaEntry } from "#workspace/application/overview-sources.ts";
import { Overview } from "#workspace/application/overview.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

const entry = (
  workspaceId: WorkspaceId,
  postId: string,
  iso: string
): AgendaEntry => ({
  excerpt: "A synthetic post",
  platforms: ["mastodon"],
  postId: PostIdSchema.make(postId),
  scheduledAt: at(iso),
  status: "scheduled",
  timeZone: "Europe/Paris",
  workspaceId,
});

describe(Overview, () => {
  it.effect(
    "gives a viewer every section a viewer's pages show, and no approving",
    () =>
      Effect.gen(function* viewer() {
        const calls = yield* noCalls();

        const page = yield* Overview.use((overview) =>
          overview.page(person, firstPage)
        ).pipe(
          Effect.provide(
            overviewOver([{ id: alpha, name: "Alpha", role: "viewer" }], calls)
          )
        );

        const [workspace] = page.workspaces;

        assert.isDefined(workspace);
        assert.isTrue(Option.isNone(workspace.refused));
        assert.deepStrictEqual(
          workspace.posts,
          Option.some({ ...figures.posts, mayApprove: false })
        );
        assert.deepStrictEqual(
          workspace.channels,
          Option.some(figures.channels)
        );
        assert.deepStrictEqual(
          workspace.inbox,
          Option.some({ unanswered: figures.unanswered })
        );
        assert.deepStrictEqual(workspace.overPlan, Option.some(false));
        assert.isTrue(Option.isNone(page.next));
      })
  );

  it.effect("tells an admin they may approve", () =>
    Effect.gen(function* admin() {
      const calls = yield* noCalls();

      const page = yield* Overview.use((overview) =>
        overview.page(person, firstPage)
      ).pipe(
        Effect.provide(
          overviewOver([{ id: bravo, name: "Bravo", role: "admin" }], calls)
        )
      );

      const [workspace] = page.workspaces;

      assert.isDefined(workspace);
      assert.deepStrictEqual(
        workspace.posts.pipe(Option.map(({ mayApprove }) => mayApprove)),
        Option.some(true)
      );
      assert.deepStrictEqual(workspace.overPlan, Option.some(true));
    })
  );

  it.effect(
    "names a workspace that requires two-step verification, with no figure, and asks no source about it",
    () =>
      Effect.gen(function* twoStep() {
        const calls = yield* noCalls();

        const page = yield* Overview.use((overview) =>
          overview.page(person, firstPage)
        ).pipe(
          Effect.provide(
            overviewOver(
              [
                { id: alpha, name: "Alpha", role: "owner" },
                {
                  id: bravo,
                  name: "Bravo",
                  role: "owner",
                  twoStepRequired: true,
                },
              ],
              calls
            )
          )
        );

        const refused = page.workspaces.find(
          ({ workspace }) => workspace.id === bravo
        );

        assert.isDefined(refused);
        assert.deepStrictEqual(refused.refused, Option.some("twoStepRequired"));
        assert.isTrue(Option.isNone(refused.posts));
        assert.isTrue(Option.isNone(refused.channels));
        assert.isTrue(Option.isNone(refused.inbox));
        assert.isTrue(Option.isNone(refused.overPlan));

        const asked = yield* Ref.get(calls);

        assert.deepStrictEqual(asked.posts, [[alpha]]);
        assert.deepStrictEqual(asked.channels, [[alpha]]);
        assert.deepStrictEqual(asked.unanswered, [[alpha]]);
        assert.deepStrictEqual(asked.overPlan, [[alpha]]);
      })
  );

  it.effect("asks the standing of a whole page at once", () =>
    Effect.gen(function* standing() {
      const calls = yield* noCalls();

      const page = yield* Overview.use((overview) =>
        overview.page(person, firstPage)
      ).pipe(
        Effect.provide(
          overviewOver(
            [
              { id: alpha, name: "Alpha", role: "viewer" },
              { id: bravo, name: "Bravo", role: "editor" },
            ],
            calls
          )
        )
      );

      assert.deepStrictEqual(
        page.workspaces.map(({ overPlan, workspace }) => [
          workspace.id,
          overPlan,
        ]),
        [
          [alpha, Option.some(false)],
          [bravo, Option.some(true)],
        ]
      );
      assert.deepStrictEqual((yield* Ref.get(calls)).overPlan, [
        [alpha, bravo],
      ]);
    })
  );

  it.effect("refuses a banned person whole", () =>
    Effect.gen(function* banned() {
      const calls = yield* noCalls();

      const failure = yield* Overview.use((overview) =>
        overview.page(person, firstPage)
      ).pipe(
        Effect.provide(
          overviewOver([{ id: alpha, name: "Alpha", role: "owner" }], calls, {
            banned: true,
          })
        ),
        Effect.flip
      );

      assert.strictEqual(failure._tag, "BannedUser");
      assert.deepStrictEqual((yield* Ref.get(calls)).posts, []);
    })
  );

  it.effect(
    "shows staff impersonating a member what the member's pages show them, and not the inbox",
    () =>
      Effect.gen(function* impersonated() {
        const calls = yield* noCalls();

        const staff = new UserPrincipal({
          impersonatedBy: Option.some(staffId),
          userId,
        });

        const page = yield* Overview.use((overview) =>
          overview.page(staff, firstPage)
        ).pipe(
          Effect.provide(
            overviewOver([{ id: alpha, name: "Alpha", role: "owner" }], calls)
          )
        );

        const [workspace] = page.workspaces;

        assert.isDefined(workspace);
        assert.isTrue(Option.isNone(workspace.inbox));
        assert.deepStrictEqual(
          workspace.posts.pipe(Option.map(({ mayApprove }) => mayApprove)),
          Option.some(false)
        );
        assert.isTrue(Option.isSome(workspace.channels));
        assert.deepStrictEqual((yield* Ref.get(calls)).unanswered, []);
      })
  );

  it.effect("answers an empty page to a person in no workspace", () =>
    Effect.gen(function* nowhere() {
      const calls = yield* noCalls();

      const page = yield* Overview.use((overview) =>
        overview.page(person, firstPage)
      ).pipe(Effect.provide(overviewOver([], calls)));

      assert.deepStrictEqual(page.workspaces, []);
      assert.isTrue(Option.isNone(page.next));
      assert.deepStrictEqual((yield* Ref.get(calls)).posts, []);
    })
  );

  it.effect("refuses an OAuth token bound to one workspace", () =>
    Effect.gen(function* bound() {
      const calls = yield* noCalls();

      const client = new UserPrincipal({
        impersonatedBy: Option.none(),
        oauth: Option.some({
          clientId: "synthetic-mcp-client",
          scopes: ["workspace:read"],
          workspaceId: Option.some(alpha),
        }),
        userId,
      });

      const failure = yield* Overview.use((overview) =>
        overview.page(client, firstPage)
      ).pipe(
        Effect.provide(
          overviewOver([{ id: alpha, name: "Alpha", role: "owner" }], calls)
        ),
        Effect.flip
      );

      assert.strictEqual(failure._tag, "PersonRequired");
    })
  );

  it.effect(
    "reads through an unbound client only what its scopes leave in each workspace",
    () =>
      Effect.gen(function* unbound() {
        const calls = yield* noCalls();

        const commandLine = new UserPrincipal({
          impersonatedBy: Option.none(),
          oauth: Option.some({
            clientId: "peal-cli",
            scopes: ["workspace:read"],
            workspaceId: Option.none(),
          }),
          userId,
        });

        const page = yield* Overview.use((overview) =>
          overview.page(commandLine, firstPage)
        ).pipe(
          Effect.provide(
            overviewOver([{ id: alpha, name: "Alpha", role: "owner" }], calls)
          )
        );

        const [workspace] = page.workspaces;

        assert.isDefined(workspace);
        // Reading is left; approving is publishing's, which it was not given.
        assert.deepStrictEqual(
          workspace.posts.pipe(Option.map(({ mayApprove }) => mayApprove)),
          Option.some(false)
        );
        assert.isTrue(Option.isSome(workspace.inbox));
      })
  );

  it.effect(
    "leaves out the sections a role does not grant, as missing rather than zero",
    () =>
      Effect.gen(function* nothingGranted() {
        const calls = yield* noCalls();

        const page = yield* Overview.use((overview) =>
          overview.page(person, firstPage)
        ).pipe(
          Effect.provide(
            // A role Peal does not know grants nothing.
            overviewOver([{ id: alpha, name: "Alpha", role: "unknown" }], calls)
          )
        );

        const [workspace] = page.workspaces;

        assert.isDefined(workspace);
        assert.isTrue(Option.isNone(workspace.refused));
        assert.isTrue(Option.isNone(workspace.posts));
        assert.isTrue(Option.isNone(workspace.channels));
        assert.isTrue(Option.isNone(workspace.inbox));
        assert.deepStrictEqual((yield* Ref.get(calls)).posts, []);
      })
  );

  it.effect(
    "pages by name then id, and a cursor makes no page repeat a workspace",
    () =>
      Effect.gen(function* pages() {
        const calls = yield* noCalls();

        const places = [
          { id: charlie, name: "Same", role: "viewer" },
          { id: alpha, name: "Zulu", role: "viewer" },
          { id: bravo, name: "Same", role: "viewer" },
        ];

        const layer = overviewOver(places, calls);

        const first = yield* Overview.use((overview) =>
          overview.page(person, { cursor: Option.none(), limit: 2 })
        ).pipe(Effect.provide(layer));

        assert.deepStrictEqual(
          first.workspaces.map(({ workspace }) => workspace.id),
          [bravo, charlie]
        );
        assert.isTrue(Option.isSome(first.next));

        const second = yield* Overview.use((overview) =>
          overview.page(person, { cursor: first.next, limit: 2 })
        ).pipe(Effect.provide(layer));

        assert.deepStrictEqual(
          second.workspaces.map(({ workspace }) => workspace.id),
          [alpha]
        );
        assert.isTrue(Option.isNone(second.next));

        const bad = yield* Overview.use((overview) =>
          overview.page(person, {
            cursor: Option.some("not-a-cursor"),
            limit: 2,
          })
        ).pipe(Effect.provide(layer), Effect.flip);

        assert.strictEqual(bad._tag, "InvalidOverviewCursor");
      })
  );

  describe("agenda", () => {
    const range = {
      from: at("2026-11-12T00:00:00Z"),
      to: at("2026-11-26T00:00:00Z"),
    };

    it.effect(
      "reads the workspaces whose members may read posts, and none other",
      () =>
        Effect.gen(function* readable() {
          const calls = yield* noCalls();

          yield* Overview.use((overview) =>
            overview.agenda(person, {
              ...range,
              cursor: Option.none(),
              limit: 10,
              workspaceIds: Option.none(),
            })
          ).pipe(
            Effect.provide(
              overviewOver(
                [
                  { id: alpha, name: "Alpha", role: "viewer" },
                  { id: bravo, name: "Bravo", role: "unknown" },
                  {
                    id: charlie,
                    name: "Charlie",
                    role: "owner",
                    twoStepRequired: true,
                  },
                ],
                calls
              )
            )
          );

          const [request] = (yield* Ref.get(calls)).agenda;

          assert.isDefined(request);
          assert.deepStrictEqual(request.workspaceIds, [alpha]);
          // One more than the page, to know whether another follows.
          assert.strictEqual(request.limit, 11);
        })
    );

    it.effect("narrows to the workspaces asked for", () =>
      Effect.gen(function* narrowed() {
        const calls = yield* noCalls();

        yield* Overview.use((overview) =>
          overview.agenda(person, {
            ...range,
            cursor: Option.none(),
            limit: 10,
            workspaceIds: Option.some([bravo, charlie]),
          })
        ).pipe(
          Effect.provide(
            overviewOver(
              [
                { id: alpha, name: "Alpha", role: "viewer" },
                { id: bravo, name: "Bravo", role: "viewer" },
              ],
              calls
            )
          )
        );

        const [request] = (yield* Ref.get(calls)).agenda;

        assert.isDefined(request);
        assert.deepStrictEqual(request.workspaceIds, [bravo]);
      })
    );

    it.effect(
      "continues after the page's last post, and says where it ended",
      () =>
        Effect.gen(function* paged() {
          const calls = yield* noCalls();

          const entries = [
            entry(
              alpha,
              "019a0000-0000-7000-8000-000000000001",
              "2026-11-13T09:00:00Z"
            ),
            entry(
              bravo,
              "019a0000-0000-7000-8000-000000000002",
              "2026-11-13T10:00:00Z"
            ),
            entry(
              alpha,
              "019a0000-0000-7000-8000-000000000003",
              "2026-11-14T09:00:00Z"
            ),
          ];

          const layer = overviewOver(
            [
              { id: alpha, name: "Alpha", role: "viewer" },
              { id: bravo, name: "Bravo", role: "viewer" },
            ],
            calls,
            { entries }
          );

          const page = yield* Overview.use((overview) =>
            overview.agenda(person, {
              ...range,
              cursor: Option.none(),
              limit: 2,
              workspaceIds: Option.none(),
            })
          ).pipe(Effect.provide(layer));

          assert.deepStrictEqual(
            page.items.map(({ postId }) => postId),
            entries.slice(0, 2).map(({ postId }) => postId)
          );
          assert.isTrue(Option.isSome(page.next));

          yield* Overview.use((overview) =>
            overview.agenda(person, {
              ...range,
              cursor: page.next,
              limit: 2,
              workspaceIds: Option.none(),
            })
          ).pipe(Effect.provide(layer));

          const [, second] = (yield* Ref.get(calls)).agenda;

          assert.isDefined(second);
          assert.deepStrictEqual(
            second.after,
            Option.some({
              postId: PostIdSchema.make("019a0000-0000-7000-8000-000000000002"),
              scheduledAt: at("2026-11-13T10:00:00Z"),
            })
          );
        })
    );

    it.effect("refuses a cursor whose time is outside the range", () =>
      Effect.gen(function* forged() {
        const calls = yield* noCalls();

        // A post's id and the furthest instant a date holds, written as
        // the agenda's cursors are: base64url of their JSON.
        const forgedCursor = Buffer.from(
          JSON.stringify({
            postId: "019a0000-0000-7000-8000-000000000001",
            scheduledAt: -8_640_000_000_000_000,
          })
        ).toString("base64url");

        const refused = yield* Overview.use((overview) =>
          overview.agenda(person, {
            ...range,
            cursor: Option.some(forgedCursor),
            limit: 10,
            workspaceIds: Option.none(),
          })
        ).pipe(
          Effect.provide(
            overviewOver([{ id: alpha, name: "Alpha", role: "viewer" }], calls)
          ),
          Effect.flip
        );

        assert.strictEqual(refused._tag, "InvalidOverviewCursor");
        assert.deepStrictEqual((yield* Ref.get(calls)).agenda, []);
      })
    );

    it.effect(
      "refuses a range past 31 days, or one that ends before it starts",
      () =>
        Effect.gen(function* tooLong() {
          const calls = yield* noCalls();

          const layer = overviewOver(
            [{ id: alpha, name: "Alpha", role: "viewer" }],
            calls
          );

          const long = yield* Overview.use((overview) =>
            overview.agenda(person, {
              cursor: Option.none(),
              from: at("2026-11-01T00:00:00Z"),
              limit: 10,
              to: at("2026-12-02T00:00:01Z"),
              workspaceIds: Option.none(),
            })
          ).pipe(Effect.provide(layer), Effect.flip);

          assert.strictEqual(long._tag, "InvalidAgendaRange");

          const backwards = yield* Overview.use((overview) =>
            overview.agenda(person, {
              cursor: Option.none(),
              from: at("2026-11-02T00:00:00Z"),
              limit: 10,
              to: at("2026-11-01T00:00:00Z"),
              workspaceIds: Option.none(),
            })
          ).pipe(Effect.provide(layer), Effect.flip);

          assert.strictEqual(backwards._tag, "InvalidAgendaRange");

          const exactly = yield* Overview.use((overview) =>
            overview.agenda(person, {
              cursor: Option.none(),
              from: at("2026-11-01T00:00:00Z"),
              limit: 10,
              to: at("2026-12-02T00:00:00Z"),
              workspaceIds: Option.none(),
            })
          ).pipe(Effect.provide(layer));

          assert.deepStrictEqual(exactly.items, []);
        })
    );

    it.effect(
      "gives each post's platforms where the member may read channels",
      () =>
        Effect.gen(function* noChannels() {
          const calls = yield* noCalls();

          const reader = new UserPrincipal({
            impersonatedBy: Option.none(),
            oauth: Option.some({
              clientId: "peal-cli",
              scopes: ["workspace:read"],
              workspaceId: Option.none(),
            }),
            userId,
          });

          const page = yield* Overview.use((overview) =>
            overview.agenda(reader, {
              ...range,
              cursor: Option.none(),
              limit: 10,
              workspaceIds: Option.none(),
            })
          ).pipe(
            Effect.provide(
              overviewOver(
                [{ id: alpha, name: "Alpha", role: "viewer" }],
                calls,
                {
                  entries: [
                    entry(
                      alpha,
                      "019a0000-0000-7000-8000-000000000001",
                      "2026-11-13T09:00:00Z"
                    ),
                  ],
                }
              )
            )
          );

          // A viewer reads channels through a reading client too.
          assert.deepStrictEqual(
            page.items.map(({ platforms }) => platforms),
            [Option.some<readonly Platform[]>(["mastodon"])]
          );
        })
    );
  });

  describe("report", () => {
    const lastWeek = {
      days: 7 as const,
      timeZone: TimeZoneIdSchema.make("Europe/Paris"),
    };

    it.effect(
      "gives each workspace's analytics where the role reads them, and none where it does not or the workspace refuses",
      () =>
        Effect.gen(function* report() {
          const calls = yield* noCalls();

          const page = yield* Overview.use((overview) =>
            overview.report(person, { ...firstPage, asked: lastWeek })
          ).pipe(
            Effect.provide(
              overviewOver(
                [
                  { id: alpha, name: "Alpha", role: "viewer" },
                  { id: bravo, name: "Bravo", role: "unknown" },
                  {
                    id: charlie,
                    name: "Charlie",
                    role: "owner",
                    twoStepRequired: true,
                  },
                ],
                calls
              )
            )
          );

          assert.deepStrictEqual(
            page.workspaces.map(({ analytics, refused, workspace }) => ({
              analytics: Option.isSome(analytics),
              id: workspace.id,
              refused,
            })),
            [
              { analytics: true, id: alpha, refused: Option.none() },
              { analytics: false, id: bravo, refused: Option.none() },
              {
                analytics: false,
                id: charlie,
                refused: Option.some("twoStepRequired"),
              },
            ]
          );
          assert.deepStrictEqual(
            page.workspaces[0]?.analytics,
            Option.some(figures.report)
          );
          assert.deepStrictEqual(page.range, reportDays);
          assert.deepStrictEqual((yield* Ref.get(calls)).report, [[alpha]]);
        })
    );
  });
});
