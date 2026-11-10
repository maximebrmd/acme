import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { commandPaths, usageOf } from "./command-tree.ts";
import { tokenEndpoints } from "./contract-endpoints.ts";

// Whatever a token can ask the API, the command line can do, or says why
// not: an agent that has the command line needs no second client. Each
// endpoint a bearer token can call (the rule the SDKs are generated with)
// is either covered by a command that takes --json, or exempt for a stated
// reason. A new endpoint fails this test until it has one or the other.

type Coverage = { readonly command: string } | { readonly exempt: string };

const by = (command: string): Coverage => ({ command });
const exempt = (reason: string): Coverage => ({ exempt: reason });

const connecting =
  "Connecting an account is a sign-in on the platform, in a browser, which comes back to the web app's callback page.";

const partnerApi =
  "The partner API is called by a partner's own server, with its partner key, as its customers come and go; the command line acts for a member or with a workspace's key.";

const partnerSettings =
  "A partner account is opened, changed and closed, and its keys created and revoked, by an owner or an admin in the web app's settings, where a new key is shown once.";

const inbox =
  "A person's own notices, which the web app shows them; an API key has none.";

const adSignIn =
  "Signing in to an ad network and choosing the ad accounts it connects is a person's, in the web app, in their own session: the server refuses an API key and an application, the command line included.";

const adSignIns =
  "Sign-ins to an ad network are listed and removed where they are made, in the web app; peal ads accounts lists the ad accounts they connect.";

const coverage = {
  "activity.list": by("activity list"),
  "ads.auditTrail": by("ads audit"),
  "ads.completeConnect": exempt(adSignIn),
  "ads.connect": exempt(adSignIn),
  "ads.connectAccounts": exempt(adSignIn),
  "ads.createBoost": by("ads boost create"),
  "ads.disconnect": exempt(
    "Removing a sign-in deletes its ad accounts, what was read of them and their boosts' records: a person does it, in the web app."
  ),
  "ads.getAccount": by("ads account"),
  "ads.getBoost": by("ads boost show"),
  "ads.listAccounts": by("ads accounts"),
  "ads.listAds": by("ads list"),
  "ads.listBoosts": by("ads boosts"),
  "ads.listCampaigns": by("ads campaigns"),
  "ads.listConnections": exempt(adSignIns),
  "ads.listInsights": by("ads insights"),
  "ads.pauseBoost": by("ads boost pause"),
  "ads.postPerformance": by("ads post"),
  "ads.quoteBoost": by("ads boost quote"),
  "ads.reachableAccounts": exempt(adSignIn),
  "ads.removeAccount": exempt(
    "Disconnecting an ad account deletes what was read of it and its boosts' records: a person does it, in the web app."
  ),
  "ads.resumeBoost": by("ads boost resume"),
  "ads.setSpending": exempt(
    "Allowing an ad account to spend, and its monthly ceiling, is an owner's decision, in the web app, in their own session: the server refuses an API key and an application, the command line included."
  ),
  "ads.status": by("ads status"),
  "ads.stopBoost": by("ads boost stop"),
  "analytics.post": by("analytics post"),
  "analytics.summary": by("analytics summary"),
  "apiKeys.create": exempt(
    "A key is created by a member in their session, in the web app, which shows its secret once; a key cannot create keys."
  ),
  "apiKeys.list": exempt(
    "Keys are managed where they are created and revoked, in the web app's settings."
  ),
  "apiKeys.revoke": exempt(
    "Keys are managed where they are created and revoked, in the web app's settings."
  ),
  "assistant.status": exempt(
    "The writing assistant serves the web app's composer; an agent writes its own text."
  ),
  "assistant.suggest": exempt(
    "The writing assistant serves the web app's composer; an agent writes its own text."
  ),
  "billing.get": by("billing"),
  "billing.standing": by("billing"),
  "capabilities.channel": by("channels capabilities"),
  "capabilities.platforms": by("channels capabilities"),
  "channels.chooseAccounts": exempt(connecting),
  "channels.completeConnect": exempt(connecting),
  "channels.connect": exempt(connecting),
  "channels.disconnect": exempt(
    "Disconnecting deletes a channel and fails its scheduled posts: a person does it, in the web app."
  ),
  "channels.list": by("channels list"),
  "channels.platforms": exempt(
    "Only the web app's connect forms read which platforms the server connects."
  ),
  "channels.reconnect": exempt(connecting),
  "connectLinks.create": by("links create"),
  "connectLinks.get": by("links show"),
  "connectLinks.list": by("links list"),
  "connectLinks.revoke": by("links revoke"),
  "invitations.create": by("invitations send"),
  "invitations.list": by("invitations list"),
  "invitations.revoke": by("invitations revoke"),
  "lookups.list": by("channels capabilities"),
  "lookups.run": by("channels lookup"),
  "media.complete": by("media upload"),
  "media.create": by("media upload"),
  "media.delete": exempt(
    "Deleting takes media out of drafts for good: a person does it in the web app, which shows the posts that use it first."
  ),
  "media.describe": exempt(
    "A description is given when the file is stored (--alt), or per post; changing the library's later is for the web app."
  ),
  "media.get": by("media show"),
  "media.importFromUrl": by("media import"),
  "media.list": by("media list"),
  "media.usage": exempt(
    "It is read before deleting a media, which the command line does not do."
  ),
  "members.list": by("members list"),
  "notices.list": exempt(inbox),
  "notices.markAllRead": exempt(inbox),
  "notices.markRead": exempt(inbox),
  "notices.unread": exempt(inbox),
  "notificationPreferences.get": exempt(inbox),
  "notificationPreferences.update": exempt(inbox),
  "partner.account": exempt(partnerApi),
  "partner.createWorkspace": exempt(partnerApi),
  "partner.deleteWorkspace": exempt(partnerApi),
  "partner.getWorkspace": exempt(partnerApi),
  "partner.listWorkspaces": exempt(partnerApi),
  "partner.updateWorkspace": exempt(partnerApi),
  "partnerAccount.close": exempt(partnerSettings),
  "partnerAccount.createKey": exempt(partnerSettings),
  "partnerAccount.get": by("partner show"),
  "partnerAccount.listKeys": by("partner keys"),
  "partnerAccount.listWorkspaces": by("partner workspaces"),
  "partnerAccount.open": exempt(partnerSettings),
  "partnerAccount.revokeKey": exempt(partnerSettings),
  "partnerAccount.update": exempt(partnerSettings),
  "posts.attempts": by("posts attempts"),
  "posts.bulk": exempt(
    "A CSV file is the command line's way to several posts, with peal posts import; a program that builds the JSON calls the API itself."
  ),
  "posts.cancel": by("posts cancel"),
  "posts.confirm": by("posts confirm"),
  "posts.create": by("drafts save"),
  "posts.discard": by("drafts discard"),
  "posts.drafts": by("drafts list"),
  "posts.get": by("posts show"),
  "posts.import": by("posts import"),
  "posts.list": exempt(
    "The command peal posts list reads posts.search, which lists the same posts over a range of time with --from and --to, and every other post too."
  ),
  "posts.outcome": by("posts wait"),
  "posts.repost": by("posts repost"),
  "posts.reschedule": by("posts reschedule"),
  "posts.schedule": by("posts schedule"),
  "posts.search": by("posts list"),
  "posts.send": by("post"),
  "posts.unschedule": by("posts unschedule"),
  "posts.update": by("drafts save"),
  "posts.validate": by("post"),
  "review.approve": by("approvals approve"),
  "review.comment": by("review comment"),
  "review.createLink": by("review link"),
  "review.links": by("review links"),
  "review.pending": by("approvals list"),
  "review.requestChanges": by("approvals request-changes"),
  "review.resolve": exempt(
    "Resolving a thread is done where its comments are read side by side with the post, in the web app."
  ),
  "review.revokeLink": by("review revoke"),
  "review.settings": by("approvals policy"),
  "review.thread": by("review show"),
  "review.updateSettings": by("approvals policy"),
  "session.me": by("whoami"),
  "system.changelog": by("doctor"),
  "system.health": by("health"),
  "system.ready": by("doctor"),
  "tiktok.creator": by("channels tiktok"),
  "webhooks.create": by("webhooks create"),
  "webhooks.delete": by("webhooks delete"),
  "webhooks.get": by("webhooks show"),
  "webhooks.list": by("webhooks list"),
  "webhooks.listDeliveries": by("webhooks deliveries"),
  "webhooks.redeliver": by("webhooks redeliver"),
  "webhooks.rotateSecret": by("webhooks rotate-secret"),
  "webhooks.sendTest": by("webhooks test"),
  "webhooks.update": by("webhooks update"),
} satisfies Record<string, Coverage>;

const commands = [
  ...new Set(
    Object.values(coverage).flatMap((entry) =>
      "command" in entry ? [entry.command] : []
    )
  ),
];

describe("the command line and the API", () => {
  it("covers or exempts every endpoint a token can call", () => {
    const ids = tokenEndpoints.map(({ id }) => id);

    assert.isAbove(ids.length, 40);
    assert.deepStrictEqual(
      ids.filter((id) => !(id in coverage)),
      [],
      "give each of these endpoints a command, or an exemption that says why not"
    );
    // Nor does the table keep an endpoint the contract no longer has.
    assert.deepStrictEqual(
      Object.keys(coverage).filter((id) => !ids.includes(id)),
      []
    );
  });

  it("gives every exemption a reason", () => {
    for (const entry of Object.values(coverage)) {
      if ("exempt" in entry) {
        assert.match(entry.exempt, /^[A-Z].{30,}\.$/u);
      }
    }
  });

  it("names commands that exist", () => {
    assert.deepStrictEqual(
      commands.filter((command) => !commandPaths.includes(command)),
      []
    );
  });

  it.effect("covers them with commands that take --json", () =>
    Effect.gen(function* json() {
      const without: string[] = [];

      for (const command of commands) {
        const { flags } = yield* usageOf(command);

        if (!flags.has("--json")) {
          without.push(command);
        }
      }

      assert.deepStrictEqual(without, []);
    })
  );

  it.effect("lets an agent read whatever it prints as JSON", () =>
    Effect.gen(function* everywhere() {
      // Every command that asks the API something, but those that sign in
      // and out, show a configuration, or save a file.
      const prose = new Set(["login", "logout", "mcp", "account export"]);
      const without: string[] = [];

      for (const command of commandPaths) {
        const isGroup = commandPaths.some((other) =>
          other.startsWith(`${command} `)
        );

        if (!isGroup && !prose.has(command)) {
          const { flags } = yield* usageOf(command);

          if (!flags.has("--json")) {
            without.push(command);
          }
        }
      }

      assert.deepStrictEqual(without, []);
    })
  );
});
