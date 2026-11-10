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

          const callers = {
            apiKey: { authorization: `Bearer ${key}` },
            impersonating: { cookie: cookiesOf(impersonation) },
            owner: { cookie: owner.cookies },
            publisher,
            reader,
            writer,
          } as const;

          const requests = {
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
              importMedia: "let through",
              listWebhooks: "forbidden",
              manageWebhooks: "forbidden",
              reduce: "forbidden",
              sendPost: "forbidden",
              standing: "let through",
            },
            // Staff acting as the owner read, write drafts and add media:
            // they publish nothing, and change neither webhooks nor what
            // the workspace keeps.
            impersonating: {
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "forbidden",
              reduce: "forbidden",
              sendPost: "forbidden",
              standing: "let through",
            },
            owner: {
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "let through",
              reduce: "let through",
              sendPost: "let through",
              standing: "let through",
            },
            // Everything the owner's role allows, but choosing what the
            // workspace keeps, which is the person's own to do.
            publisher: {
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "let through",
              reduce: "forbidden",
              sendPost: "let through",
              standing: "let through",
            },
            reader: {
              importMedia: "forbidden",
              listWebhooks: "let through",
              manageWebhooks: "forbidden",
              reduce: "forbidden",
              sendPost: "forbidden",
              standing: "let through",
            },
            // Writing is not publishing.
            writer: {
              importMedia: "let through",
              listWebhooks: "let through",
              manageWebhooks: "let through",
              reduce: "forbidden",
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
              importMedia: "MediaSourceNotPublic",
              listWebhooks: "ok",
              manageWebhooks: "WebhookUrlRefused",
              reduce: "BillingNotEnabled",
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

          const requests: Readonly<
            Record<
              string,
              {
                readonly body?: unknown;
                readonly method?: string;
                readonly path: string;
              }
            >
          > = {
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
          };

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
                .filter(([, { answer }]) => answer === "let through")
                .map(([name]) => name)
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
        })
    );
  }
);
