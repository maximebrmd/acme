// Who may use what the posting, webhook and plan endpoints added, through
// the whole server: a member in their session, the command line allowed to
// read only, or to write without publishing, an API key that writes drafts
// at most, and staff acting as the member. Each gets what the scopes, the
// key's permissions and the impersonation rules say, on every one of them.
import { assert, layer } from "@effect/vitest";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { HttpApiClient } from "effect/http-api";
import { deviceCodeGrantType, OAuthApi } from "peal-contract";

import { SqlLive } from "#shared/infrastructure/database.ts";
import {
  apiKeyOf,
  confirmedAccount,
  cookiesOf,
  inProcessHttpClient,
  makeAdmin,
  origin,
  signedUpUnconfirmed,
  signIn,
  TestApp,
  unconfirmedEmails,
  workspaceOf,
} from "#test/workspace/integration/harness.ts";
import type { Person } from "#test/workspace/integration/harness.ts";

class OAuth extends Context.Service<
  OAuth,
  HttpApiClient.ForApi<typeof OAuthApi>
>()("peal-server/test/SurfaceAccessOAuth") {
  // The fetch client reads its Fetch when each request runs, so it stays in
  // the tests' context.
  static readonly layer = Layer.effect(
    OAuth,
    HttpApiClient.make(OAuthApi, { baseUrl: origin })
  ).pipe(Layer.provideMerge(inProcessHttpClient));
}

const Test = Layer.mergeAll(OAuth.layer, SqlLive).pipe(
  Layer.provideMerge(TestApp.layerWith(unconfirmedEmails))
);

// The command line, signed in by `person` with the scopes they allowed.
const commandLine = Effect.fn("commandLine")(function* commandLine(
  person: Person,
  scope: string
) {
  const app = yield* TestApp;
  const oauth = yield* OAuth;

  const device = yield* oauth.tokens.deviceAuthorization({
    payload: { client_id: "peal-cli", resource: `${origin}/api`, scope },
  });

  // The user code as people type it, which the page reviews first.
  const typed =
    `${device.user_code.slice(0, 4)}-${device.user_code.slice(4)}`.toLowerCase();

  const reviewed = yield* app.request(`/api/auth/device?user_code=${typed}`, {
    headers: { cookie: person.cookies },
  });

  assert.strictEqual(reviewed.status, 200);

  const approved = yield* app.request("/api/auth/device/approve", {
    body: { userCode: device.user_code },
    headers: { cookie: person.cookies },
  });

  assert.strictEqual(approved.status, 200);

  const tokens = yield* oauth.tokens.token({
    payload: {
      client_id: "peal-cli",
      device_code: device.device_code,
      grant_type: deviceCodeGrantType,
    },
  });

  return { authorization: `Bearer ${tokens.access_token}` };
});

// The error an answer names, when it names one.
const decodeTagged = Schema.decodeUnknownOption(
  Schema.Struct({ _tag: Schema.String })
);

// What each endpoint answers a caller: 403 when they may not, and anything
// else once they are let through to the use case's own rules.
type Answer = "forbidden" | "let through";

// A request of the second table: its path, and what it sends.
interface Asked {
  readonly body?: unknown;
  readonly method?: string;
  readonly path: string;
}

const answerOf = (status: number): Answer =>
  status === 403 ? "forbidden" : "let through";

layer(Test, { excludeTestServices: true, timeout: "180 seconds" })(
  "the posting, webhook and plan endpoints",
  (it) => {
    it.effect(
      "answer each kind of caller as its scopes, permissions or impersonation allow",
      () =>
        Effect.gen(function* access() {
          const app = yield* TestApp;
          const owner = yield* signedUpUnconfirmed("surface-owner");
          const workspaceId = yield* workspaceOf(owner, "Surfaces");
          const base = `/api/workspaces/${workspaceId}`;

          const reader = yield* commandLine(
            owner,
            "offline_access workspace:read"
          );

          const writer = yield* commandLine(
            owner,
            "offline_access workspace:read workspace:write"
          );

          const publisher = yield* commandLine(
            owner,
            "offline_access workspace:read workspace:write workspace:publish"
          );

          // A key that writes drafts and adds media, and publishes nothing.
          const { key } = yield* apiKeyOf(owner, workspaceId, [
            "post:read",
            "post:create",
            "media:read",
            "media:upload",
          ]);

          const staff = yield* confirmedAccount("surface-staff");

          yield* makeAdmin(staff.id);

          const staffCookies = yield* signIn(staff.email);

          const impersonation = yield* app.request(
            `/api/admin/users/${owner.id}/impersonate`,
            {
              body: { reason: "Synthetic support ticket 12" },
              headers: { cookie: staffCookies },
            }
          );

          assert.strictEqual(impersonation.status, 204);

          // The requests to cancel or withdraw that wait for staff answer
          // staff in their own session, and nobody else: not staff acting
          // as a member, a member, a token or a key, who are all told
          // there is nothing there.
          const desk = (headers: Readonly<Record<string, string>>) =>
            app
              .request("/api/admin/contract-requests", { headers })
              .pipe(Effect.map(({ status }) => status));

          assert.deepStrictEqual(
            yield* Effect.all([
              desk({ cookie: staffCookies }),
              desk({ cookie: cookiesOf(impersonation) }),
              desk({ cookie: owner.cookies }),
              desk(publisher),
              desk({ authorization: `Bearer ${key}` }),
            ]),
            [200, 404, 404, 404, 404]
          );

          // The billing accounts desk is the same: staff in their own
          // session, and nobody else.
          const accountsDesk = (headers: Readonly<Record<string, string>>) =>
            app
              .request("/api/admin/billing/shared-channels", { headers })
              .pipe(Effect.map(({ status }) => status));

          assert.deepStrictEqual(
            yield* Effect.all([
              accountsDesk({ cookie: staffCookies }),
              accountsDesk({ cookie: cookiesOf(impersonation) }),
              accountsDesk({ cookie: owner.cookies }),
              accountsDesk(publisher),
              accountsDesk({ authorization: `Bearer ${key}` }),
            ]),
            [200, 404, 404, 404, 404]
          );

          const account = yield* app
            .request(`/api/admin/billing/accounts?workspaceId=${workspaceId}`, {
              headers: { cookie: staffCookies },
            })
            .pipe(
              Effect.flatMap(({ body }) =>
                Schema.decodeUnknownEffect(
                  Schema.Struct({ id: Schema.String })
                )(body)
              ),
              Effect.orDie
            );

          const required = (headers: Readonly<Record<string, string>>) =>
            app
              .request("/api/admin/billing/accounts/payment-method", {
                body: {
                  accountId: account.id,
                  reason: "Synthetic abuse report 7",
                  required: true,
                },
                headers,
              })
              .pipe(Effect.map(({ status }) => status));

          assert.deepStrictEqual(
            yield* Effect.all([
              required({ cookie: owner.cookies }),
              required({ cookie: cookiesOf(impersonation) }),
              required({ cookie: staffCookies }),
            ]),
            [404, 404, 200]
          );

          // Recorded in the audit log, by the account's id.
          const audit = yield* app
            .request("/api/admin/audit", { headers: { cookie: staffCookies } })
            .pipe(
              Effect.flatMap(({ body }) =>
                Schema.decodeUnknownEffect(
                  Schema.Struct({
                    items: Schema.Array(
                      Schema.Struct({
                        action: Schema.String,
                        objectIds: Schema.Record(Schema.String, Schema.String),
                        reason: Schema.NullOr(Schema.String),
                      })
                    ),
                  })
                )(body)
              ),
              Effect.orDie
            );

          assert.deepInclude(
            audit.items.filter(
              ({ objectIds }) => objectIds["accountId"] === account.id
            ),
            {
              action: "requirePaymentMethod",
              objectIds: { accountId: account.id },
              reason: "Synthetic abuse report 7",
            }
          );

          const callers = {
            apiKey: { authorization: `Bearer ${key}` },
            impersonating: { cookie: cookiesOf(impersonation) },
            owner: { cookie: owner.cookies },
            publisher,
            reader,
            writer,
          } as const;

          const requests = {
            // Onto the default queue, which the workspace does not have:
            // refused once the caller may publish.
            enqueuePost: {
              body: {},
              path: `${base}/posts/0190f3a0-0000-7000-8000-00000000d0de/queue`,
            },
            // Fetched from nowhere: a loopback address is refused once the
            // caller may add media.
            importMedia: {
              body: { url: "https://127.0.0.1/picture.png" },
              path: `${base}/media/import`,
            },
            listWebhooks: { path: `${base}/webhooks` },
            // Refused once the caller may manage webhooks: no receiver
            // listens on plain HTTP.
            manageWebhooks: {
              body: {
                eventTypes: ["post.published"],
                url: "http://hooks.example.com/peal",
              },
              path: `${base}/webhooks`,
            },
            // This server does not bill: nothing to reduce, once the
            // caller may.
            reduce: {
              body: { keepChannelIds: [], keepMemberIds: [] },
              path: `${base}/billing/reduction`,
            },
            // For a channel the workspace does not have: refused once the
            // caller may save what posts are written with.
            saveQueue: {
              body: {
                channelIds: ["0190f3a0-0000-7000-8000-00000000c0de"],
                name: "Synthetic queue",
                slots: [{ day: "monday", time: "09:00" }],
                timeZone: "Europe/Paris",
              },
              path: `${base}/queues`,
            },
            // On a channel the workspace does not have: refused once the
            // caller may publish.
            sendPost: {
              body: {
                channelIds: ["0190f3a0-0000-7000-8000-00000000c0de"],
                content: {
                  media: [],
                  overrides: [],
                  text: "A synthetic post.",
                },
                when: { _tag: "now" },
              },
              path: `${base}/posts/send`,
            },
            standing: { path: `${base}/billing/standing` },
          } as const;

          const asked = yield* Effect.forEach(
            Object.entries(callers),
            ([caller, headers]) =>
              Effect.forEach(Object.entries(requests), ([name, request]) =>
                app
                  .request(request.path, { ...request, headers })
                  .pipe(
                    Effect.map(
                      (reply) =>
                        [
                          name,
                          { answer: answerOf(reply.status), reply },
                        ] as const
                    )
                  )
              ).pipe(
                Effect.map((answers) => [caller, new Map(answers)] as const)
              )
          );

          const answers = Object.fromEntries(
            asked.map(([caller, byRequest]) => [
              caller,
              Object.fromEntries(
                [...byRequest].map(([name, { answer }]) => [name, answer])
              ),
            ])
          );

          assert.deepStrictEqual(answers, {
            // No publishing, no webhooks, no billing: only what it was
            // given, and where the workspace stands, as any member reads.
            apiKey: {
              enqueuePost: "forbidden",
              importMedia: "let through",
              listWebhooks: "forbidden",
              manageWebhooks: "forbidden",
              reduce: "forbidden",
              saveQueue: "forbidden",
              sendPost: "forbidden",
              standing: "let through",
            },
            // Staff acting as the owner read, write drafts and add media:
            // they publish nothing, and change neither webhooks nor what
            // the workspace keeps.
            impersonating: {
              enqueuePost: "forbidden",
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "forbidden",
              reduce: "forbidden",
              saveQueue: "let through",
              sendPost: "forbidden",
              standing: "let through",
            },
            owner: {
              enqueuePost: "let through",
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "let through",
              reduce: "let through",
              saveQueue: "let through",
              sendPost: "let through",
              standing: "let through",
            },
            // Everything the owner's role allows, but choosing what the
            // workspace keeps, which is the person's own to do.
            publisher: {
              enqueuePost: "let through",
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "let through",
              reduce: "forbidden",
              saveQueue: "let through",
              sendPost: "let through",
              standing: "let through",
            },
            reader: {
              enqueuePost: "forbidden",
              importMedia: "forbidden",
              listWebhooks: "let through",
              manageWebhooks: "forbidden",
              reduce: "forbidden",
              saveQueue: "forbidden",
              sendPost: "forbidden",
              standing: "let through",
            },
            // Writing is not publishing.
            writer: {
              enqueuePost: "forbidden",
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "let through",
              reduce: "forbidden",
              saveQueue: "let through",
              sendPost: "forbidden",
              standing: "let through",
            },
          });

          // Let through, the owner meets each use case's own refusal, so
          // none of the above passed for want of a check.
          const ownerAnswers = new Map(asked).get("owner");

          assert.deepStrictEqual(
            Object.fromEntries(
              [...(ownerAnswers ?? [])].map(([name, { reply }]) => [
                name,
                reply.status === 200
                  ? "ok"
                  : Option.match(decodeTagged(reply.body), {
                      onNone: () => "",
                      onSome: ({ _tag }) => _tag,
                    }),
              ])
            ),
            {
              enqueuePost: "QueueNotFound",
              importMedia: "MediaSourceNotPublic",
              listWebhooks: "ok",
              manageWebhooks: "WebhookUrlRefused",
              reduce: "BillingNotEnabled",
              saveQueue: "UnknownChannels",
              sendPost: "UnknownChannels",
              standing: "ok",
            }
          );
        })
    );

    it.effect(
      "answer each kind of caller alike for the inbox, analytics and posts of several parts",
      () =>
        Effect.gen(function* access() {
          const app = yield* TestApp;
          const owner = yield* signedUpUnconfirmed("depth-owner");
          const workspaceId = yield* workspaceOf(owner, "Depths");
          const base = `/api/workspaces/${workspaceId}`;

          const reader = yield* commandLine(
            owner,
            "offline_access workspace:read"
          );

          const writer = yield* commandLine(
            owner,
            "offline_access workspace:read workspace:write"
          );

          const publisher = yield* commandLine(
            owner,
            "offline_access workspace:read workspace:write workspace:publish"
          );

          // A key that writes drafts (which reads the channels they go
          // to), and one for a help desk: it reads and answers comments
          // and reads the numbers, and writes no post.
          const drafts = yield* apiKeyOf(owner, workspaceId, [
            "channel:read",
            "post:read",
            "post:create",
          ]);

          const desk = yield* apiKeyOf(owner, workspaceId, [
            "analytics:read",
            "engagement:read",
            "engagement:reply",
          ]);

          const staff = yield* confirmedAccount("depth-staff");

          yield* makeAdmin(staff.id);

          const staffCookies = yield* signIn(staff.email);

          const impersonation = yield* app.request(
            `/api/admin/users/${owner.id}/impersonate`,
            {
              body: { reason: "Synthetic support ticket 13" },
              headers: { cookie: staffCookies },
            }
          );

          assert.strictEqual(impersonation.status, 204);

          const callers = {
            deskKey: { authorization: `Bearer ${desk.key}` },
            draftsKey: { authorization: `Bearer ${drafts.key}` },
            impersonating: { cookie: cookiesOf(impersonation) },
            owner: { cookie: owner.cookies },
            publisher,
            reader,
            writer,
          } as const;

          // Ids the workspace does not have: once let through, each
          // request meets its use case's own refusal and changes nothing.
          const unknown = "0190f3a0-0000-7000-8000-00000000c0de";
          const days = "days=7&timeZone=Europe%2FParis";

          const threadOf = {
            channelIds: [unknown],
            content: {
              followUps: [
                {
                  delaySeconds: 60,
                  media: [],
                  overrides: [],
                  text: "A synthetic second part.",
                },
              ],
              media: [],
              overrides: [],
              text: "A synthetic first part.",
            },
          };

          const requests = {
            answerComment: {
              body: { text: "Thank you." },
              path: `${base}/inbox/comments/${unknown}/replies`,
            },
            channelNumbers: {
              path: `${base}/analytics/channels/${unknown}?${days}`,
            },
            confirmReply: {
              body: { sent: true },
              path: `${base}/inbox/replies/${unknown}/confirmation`,
            },
            dashboard: { path: `${base}/analytics/dashboard?${days}` },
            draftThread: { body: threadOf, path: `${base}/posts` },
            exportAccounts: {
              path: `${base}/analytics/export?kind=accounts&${days}`,
            },
            exportPosts: {
              path: `${base}/analytics/export?kind=posts&format=json&${days}`,
            },
            listThreads: { path: `${base}/inbox/threads` },
            moderateComment: {
              body: { action: "like" },
              path: `${base}/inbox/comments/${unknown}/moderation`,
            },
            readThread: { path: `${base}/inbox/threads/${unknown}` },
            sendThread: {
              body: { ...threadOf, when: { _tag: "now" } },
              path: `${base}/posts/send`,
            },
            settleComment: {
              body: { answered: true },
              path: `${base}/inbox/comments/${unknown}/answered`,
            },
            withdrawReply: {
              method: "DELETE",
              path: `${base}/inbox/replies/${unknown}`,
            },
          } satisfies Readonly<Record<string, Asked>>;

          const asked = yield* Effect.forEach(
            Object.entries(callers),
            ([caller, headers]) =>
              Effect.forEach(Object.entries(requests), ([name, request]) =>
                app
                  .request(request.path, { ...request, headers })
                  .pipe(
                    Effect.map(
                      (reply) =>
                        [
                          name,
                          { answer: answerOf(reply.status), reply },
                        ] as const
                    )
                  )
              ).pipe(
                Effect.map((answers) => [caller, new Map(answers)] as const)
              )
          );

          const allowed = Object.fromEntries(
            asked.map(([caller, byRequest]) => [
              caller,
              [...byRequest]
                .flatMap(([name, { answer }]) =>
                  answer === "let through" ? [name] : []
                )
                .toSorted(),
            ])
          );

          const numbers = [
            "channelNumbers",
            "dashboard",
            "exportAccounts",
            "exportPosts",
          ];

          const comments = ["listThreads", "readThread"];

          const answering = [
            "answerComment",
            "confirmReply",
            "moderateComment",
            "settleComment",
            "withdrawReply",
          ];

          assert.deepStrictEqual(allowed, {
            // A key does what it was given, and nothing beside: comments
            // and numbers, and no post.
            deskKey: [...numbers, ...comments, ...answering].toSorted(),
            draftsKey: ["draftThread"],
            // Staff acting as the owner read the numbers and write drafts.
            // They read no comment, which other people wrote, answer none
            // and put nothing out.
            impersonating: [...numbers, "draftThread"].toSorted(),
            owner: Object.keys(requests).toSorted(),
            publisher: Object.keys(requests).toSorted(),
            // Reading is the numbers, their exports and the comments.
            reader: [...numbers, ...comments].toSorted(),
            // Writing is drafts, parts included. Answering a comment in
            // public is publishing, as sending a post is.
            writer: [...numbers, ...comments, "draftThread"].toSorted(),
          });

          // Let through, the owner meets each use case's own answer, so
          // none of the above passed for want of a check.
          const ownerAnswers = new Map(asked).get("owner");

          assert.deepStrictEqual(
            Object.fromEntries(
              [...(ownerAnswers ?? [])].map(([name, { reply }]) => [
                name,
                reply.status === 200
                  ? "ok"
                  : Option.match(decodeTagged(reply.body), {
                      onNone: () => String(reply.status),
                      onSome: ({ _tag }) => _tag,
                    }),
              ])
            ),
            {
              answerComment: "InboxCommentNotFound",
              channelNumbers: "ok",
              confirmReply: "InboxReplyNotFound",
              dashboard: "ok",
              draftThread: "UnknownChannels",
              exportAccounts: "ok",
              exportPosts: "ok",
              listThreads: "ok",
              moderateComment: "InboxCommentNotFound",
              readThread: "InboxThreadNotFound",
              sendThread: "UnknownChannels",
              settleComment: "InboxCommentNotFound",
              withdrawReply: "InboxReplyNotFound",
            }
          );

          // Every answer of theirs is in the API's envelope: a code that
          // never changes, words for a person, and the request's id.
          const Envelope = Schema.decodeUnknownSync(
            Schema.Struct({
              code: Schema.String,
              message: Schema.String,
              permission: Schema.optionalKey(Schema.String),
              reason: Schema.optionalKey(Schema.String),
              requestId: Schema.String,
              scope: Schema.optionalKey(Schema.String),
            })
          );

          const answered = (caller: string, request: string) =>
            Envelope(new Map(asked).get(caller)?.get(request)?.reply.body);

          assert.deepInclude(answered("owner", "answerComment"), {
            code: "inbox_comment_not_found",
          });
          assert.deepInclude(answered("owner", "confirmReply"), {
            code: "inbox_reply_not_found",
          });
          assert.deepInclude(answered("owner", "readThread"), {
            code: "inbox_thread_not_found",
          });

          // A refusal says what is missing, and whose it is to give.
          assert.deepInclude(answered("writer", "answerComment"), {
            code: "forbidden",
            permission: "engagement:reply",
            reason: "missingScope",
            scope: "workspace:publish",
          });
          assert.deepInclude(answered("draftsKey", "listThreads"), {
            code: "forbidden",
            permission: "engagement:read",
            reason: "missingPermission",
          });
          assert.deepInclude(answered("draftsKey", "exportPosts"), {
            code: "forbidden",
            permission: "analytics:read",
            reason: "missingPermission",
          });
          assert.deepInclude(answered("impersonating", "listThreads"), {
            code: "forbidden",
            permission: "engagement:read",
          });
        })
    );

    it.effect("tell a refused caller what it lacks, and how to get it", () =>
      Effect.gen(function* refusals() {
        const app = yield* TestApp;
        const owner = yield* signedUpUnconfirmed("refusal-owner");
        const workspaceId = yield* workspaceOf(owner, "Refusals");
        const other = yield* workspaceOf(owner, "Elsewhere");

        const writer = yield* commandLine(
          owner,
          "offline_access workspace:read workspace:write"
        );

        const { key } = yield* apiKeyOf(owner, workspaceId, [
          "post:read",
          "post:create",
        ]);

        const send = (
          headers: Readonly<Record<string, string>>,
          workspace = workspaceId
        ) =>
          app.request(`/api/workspaces/${workspace}/posts/send`, {
            body: {
              channelIds: ["0190f3a0-0000-7000-8000-00000000c0de"],
              content: { media: [], overrides: [], text: "Synthetic." },
              when: { _tag: "now" },
            },
            headers,
          });

        const refusal = Schema.decodeUnknownSync(
          Schema.Struct({
            _tag: Schema.Literal("Forbidden"),
            code: Schema.Literal("forbidden"),
            message: Schema.String,
            permission: Schema.optionalKey(Schema.String),
            reason: Schema.String,
            requestId: Schema.String,
            scope: Schema.optionalKey(Schema.String),
          })
        );

        // An application its user did not let publish: the scope to ask
        // for, in the body and as RFC 6750 challenges.
        const unscoped = yield* send(writer);
        const lacking = refusal(unscoped.body);

        assert.strictEqual(unscoped.status, 403);
        assert.strictEqual(lacking.reason, "missingScope");
        assert.strictEqual(lacking.scope, "workspace:publish");
        assert.strictEqual(lacking.permission, "post:schedule");
        assert.include(lacking.message, "workspace:publish");
        assert.include(lacking.message, "peal login");
        assert.strictEqual(
          unscoped.headers.get("www-authenticate"),
          'Bearer error="insufficient_scope", scope="workspace:publish"'
        );

        // A key made without the permission: nothing to sign in to.
        const keyed = yield* send({ authorization: `Bearer ${key}` });
        const unpermitted = refusal(keyed.body);

        assert.strictEqual(keyed.status, 403);
        assert.strictEqual(unpermitted.reason, "missingPermission");
        assert.strictEqual(unpermitted.permission, "post:schedule");
        assert.isUndefined(unpermitted.scope);
        assert.include(unpermitted.message, "API key");
        assert.include(unpermitted.message, "post:schedule");
        assert.isNull(keyed.headers.get("www-authenticate"));

        // The key in a workspace that is not its own.
        const elsewhere = yield* send(
          { authorization: `Bearer ${key}` },
          other
        );

        assert.strictEqual(elsewhere.status, 403);
        assert.strictEqual(refusal(elsewhere.body).reason, "wrongWorkspace");

        // A cookie a browser sent from another site.
        const foreign = yield* send({
          cookie: owner.cookies,
          origin: "https://elsewhere.example",
        });

        assert.strictEqual(foreign.status, 403);
        assert.strictEqual(refusal(foreign.body).reason, "untrustedOrigin");

        // What only the person does, asked by a key.
        const person = yield* app.request(
          `/api/workspaces/${workspaceId}/members`,
          { headers: { authorization: `Bearer ${key}` } }
        );

        assert.strictEqual(person.status, 403);
        assert.strictEqual(refusal(person.body).reason, "personRequired");
      })
    );
  }
);
