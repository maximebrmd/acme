import { assert, layer } from "@effect/vitest";
import { DateTime, Duration, Effect, Layer, Option } from "effect";

import { ChannelNotices } from "#channels/application/channel-notices.ts";
import { markRefreshNeeded } from "#channels/domain/channel.ts";
import { NotifiedChannelNotices } from "#channels/infrastructure/notified-channel-notices.ts";
import { DeliverNoticeEmails } from "#notifications/application/deliver-notice-emails.ts";
import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import { NotificationSettings } from "#notifications/application/notification-settings.ts";
import { Notify } from "#notifications/application/notify.ts";
import type { NoticeRequest } from "#notifications/application/notify.ts";
import { DatabaseError } from "#shared/application/database-error.ts";
import { newId } from "#shared/application/ids.ts";
import { TransactionRunner } from "#shared/application/transaction-runner.ts";
import type { Permission } from "#shared/domain/access.ts";
import { PostIdSchema } from "#shared/domain/ids.ts";
import type { UserId, WorkspaceId } from "#shared/domain/ids.ts";
import type { Locale } from "#shared/domain/locale.ts";
import { freshChannel, freshWorkspace } from "#test/channels/support.ts";
import { StartedDeliveries } from "#test/notifications/started-deliveries.ts";
import {
  freshUser,
  NoticesTest,
  readerOf,
  sentTo,
} from "#test/notifications/support.ts";
import { TestDirectory } from "#test/notifications/test-directory.ts";
import { TestMailer } from "#test/notifications/test-mailer.ts";
import { permissionsFor } from "#workspace/domain/roles.ts";

const Test = NotifiedChannelNotices.pipe(Layer.provideMerge(NoticesTest));

const editor = permissionsFor("editor");

const owner = permissionsFor("owner");

const viewer = permissionsFor("viewer");

const contributor = permissionsFor("contributor");

interface Person {
  readonly email: string;
  readonly userId: UserId;
}

// A workspace of its own with members of these roles, each reading `locale`.
const workspaceWith = Effect.fn("workspaceWith")(function* workspaceWith(
  members: readonly {
    readonly locale: Locale;
    readonly permissions: readonly Permission[];
  }[]
) {
  const workspaceId = yield* freshWorkspace;

  const people = yield* Effect.all(
    members.map((member) =>
      freshUser.pipe(
        Effect.map((userId) => ({
          ...member,
          email: `member+${userId}@example.test`,
          userId,
        }))
      )
    )
  );

  yield* TestDirectory.use((directory) =>
    directory.setMembers(workspaceId, people)
  );

  return { people, workspaceId };
});

const noticesOf = (person: Person) =>
  NoticeInbox.use((inbox) =>
    inbox.page(readerOf(person.userId), { after: Option.none(), limit: 50 })
  ).pipe(Effect.map(({ items }) => items));

const deliver = (key: string) =>
  DeliverNoticeEmails.use((emails) => emails.deliver(key));

const startedFor = (key: string) =>
  StartedDeliveries.use(({ keys }) => keys).pipe(
    Effect.map((keys) => keys.filter((started) => started === key))
  );

const failedPost = (workspaceId: WorkspaceId) =>
  Effect.gen(function* makingFailedPost() {
    const postId = yield* newId(PostIdSchema);

    const request: NoticeRequest = {
      event: {
        _tag: "PostFailed",
        channel: Option.some({ handle: "@acme_example", platform: "mastodon" }),
        postId,
        reason: "rateLimited",
      },
      key: `post-target:${postId}:1`,
      workspaceId,
    };

    return request;
  });

layer(Test)("notices", (it) => {
  it.effect(
    "tell each channel manager once per event, in the app and by email, in their language",
    () =>
      Effect.gen(function* once() {
        const { people, workspaceId } = yield* workspaceWith([
          { locale: "en", permissions: owner },
          { locale: "fr", permissions: owner },
          // May not connect channels: hears nothing about them.
          { locale: "en", permissions: viewer },
        ]);

        const [ada, chloe, viola] = people;

        assert(ada !== undefined && chloe !== undefined && viola !== undefined);

        const channel = markRefreshNeeded(
          yield* freshChannel(workspaceId, { platform: "mastodon" }),
          yield* DateTime.now
        );

        const notices = yield* ChannelNotices;

        yield* notices.reconnectRequired(channel);
        yield* notices.reconnectRequired(channel);

        const key = `channel:${channel.id}:reconnect-required:${DateTime.formatIso(channel.updatedAt)}`;

        assert.lengthOf(yield* noticesOf(ada), 1);
        assert.lengthOf(yield* noticesOf(chloe), 1);
        assert.lengthOf(yield* noticesOf(viola), 0);
        assert.deepStrictEqual((yield* noticesOf(ada))[0]?.event, {
          _tag: "ChannelReconnectRequired",
          channel: { handle: "@acme_example", platform: "mastodon" },
        });

        // Emails wait for the commit, then go out once.
        assert.lengthOf(yield* startedFor(key), 1);
        assert.strictEqual(yield* deliver(key), 0);
        assert.strictEqual(yield* deliver(key), 0);

        const toAda = yield* sentTo(ada.email);
        const toChloe = yield* sentTo(chloe.email);

        assert.deepStrictEqual(
          [...toAda, ...toChloe].map(({ subject }) => subject),
          [
            "Reconnect @acme_example on Mastodon",
            "Reconnectez @acme_example sur Mastodon",
          ]
        );
        assert.include(
          toChloe[0]?.text ?? "",
          `http://localhost:3001/fr/app/${workspaceId}/channels`
        );
        assert.include(
          toAda[0]?.text ?? "",
          `http://localhost:3001/app/${workspaceId}/channels`
        );
        assert.notStrictEqual(
          toAda[0]?.idempotencyKey,
          toChloe[0]?.idempotencyKey
        );
      })
  );

  it.effect("warn again for a new expiry, not for the same one", () =>
    Effect.gen(function* perExpiry() {
      const { people, workspaceId } = yield* workspaceWith([
        { locale: "en", permissions: owner },
      ]);

      const [ada] = people;

      assert(ada !== undefined);

      const channel = yield* freshChannel(workspaceId, {
        platform: "linkedin",
      });

      const notices = yield* ChannelNotices;
      const now = yield* DateTime.now;
      const first = DateTime.addDuration(now, Duration.days(6));
      const next = DateTime.addDuration(now, Duration.days(66));

      yield* notices.reconnectSoon(channel, first);
      yield* notices.reconnectSoon(channel, first);
      yield* notices.reconnectSoon(channel, next);

      assert.lengthOf(yield* noticesOf(ada), 2);
    })
  );

  it.effect("notify once when the same event arrives twice at once", () =>
    Effect.gen(function* concurrent() {
      const { people, workspaceId } = yield* workspaceWith([
        { locale: "en", permissions: editor },
      ]);

      const [ada] = people;

      assert(ada !== undefined);

      const request = yield* failedPost(workspaceId);
      const notify = yield* Notify;

      // The second waits on the first's key, then finds it taken.
      yield* Effect.all([notify.notify(request), notify.notify(request)], {
        concurrency: 2,
      });

      yield* notify.notify(request);

      assert.lengthOf(yield* noticesOf(ada), 1);
      assert.lengthOf(yield* startedFor(request.key), 1);
    })
  );

  it.effect("record nothing when the caller's transaction rolls back", () =>
    Effect.gen(function* rollsBack() {
      const { people, workspaceId } = yield* workspaceWith([
        { locale: "en", permissions: editor },
      ]);

      const [ada] = people;

      assert(ada !== undefined);

      const request = yield* failedPost(workspaceId);
      const notify = yield* Notify;
      const { transaction } = yield* TransactionRunner;

      const failure = new DatabaseError({ cause: "the settlement failed" });

      yield* transaction(
        notify.notify(request).pipe(Effect.andThen(Effect.fail(failure)))
      ).pipe(Effect.flip);

      assert.lengthOf(yield* noticesOf(ada), 0);

      // The key went with the rest: the retried step notifies.
      yield* transaction(notify.notify(request));

      assert.lengthOf(yield* noticesOf(ada), 1);
    })
  );

  it.effect(
    "email failed posts by default, published ones once asked, and nothing turned off",
    () =>
      Effect.gen(function* preferences() {
        const { people, workspaceId } = yield* workspaceWith([
          { locale: "en", permissions: editor },
          { locale: "en", permissions: editor },
        ]);

        const [ada, bea] = people;

        assert(ada !== undefined && bea !== undefined);

        const settings = yield* NotificationSettings;
        const notify = yield* Notify;

        yield* settings.change(readerOf(ada.userId), {
          email: { postPublished: true },
        });
        yield* settings.change(readerOf(bea.userId), {
          email: { postFailed: false },
        });

        const failed = yield* failedPost(workspaceId);
        const postId = yield* newId(PostIdSchema);

        const published: NoticeRequest = {
          event: {
            _tag: "PostPublished",
            channel: Option.none(),
            permalink: Option.none(),
            postId,
          },
          key: `post-target:${postId}:1`,
          workspaceId,
        };

        yield* notify.notify(failed);
        yield* notify.notify(published);
        yield* deliver(failed.key);
        yield* deliver(published.key);

        // Both see both in the app, whatever their emails.
        assert.lengthOf(yield* noticesOf(ada), 2);
        assert.lengthOf(yield* noticesOf(bea), 2);
        assert.deepStrictEqual(
          (yield* sentTo(ada.email)).map(({ subject }) => subject),
          [
            "A post did not go out on Mastodon (@acme_example)",
            "Published on a disconnected channel",
          ]
        );
        assert.lengthOf(yield* sentTo(bea.email), 0);
      })
  );

  it.effect("start no delivery when nobody wants the email", () =>
    Effect.gen(function* quiet() {
      const { workspaceId } = yield* workspaceWith([
        { locale: "en", permissions: editor },
      ]);

      const postId = yield* newId(PostIdSchema);
      const key = `post-target:${postId}:1`;

      yield* Notify.use((notify) =>
        notify.notify({
          event: {
            _tag: "PostPublished",
            channel: Option.none(),
            permalink: Option.none(),
            postId,
          },
          key,
          workspaceId,
        })
      );

      assert.lengthOf(yield* startedFor(key), 0);
    })
  );

  it.effect(
    "tell a post's author, whatever their role, and email them as they choose",
    () =>
      Effect.gen(function* toAuthor() {
        const { people, workspaceId } = yield* workspaceWith([
          { locale: "en", permissions: contributor },
          { locale: "en", permissions: editor },
          { locale: "en", permissions: contributor },
        ]);

        const [author, editorMember, other] = people;

        assert(
          author !== undefined &&
            editorMember !== undefined &&
            other !== undefined
        );

        const request = yield* failedPost(workspaceId);

        yield* Notify.use((notify) =>
          notify.notify({ ...request, author: author.userId })
        );

        assert.lengthOf(yield* noticesOf(author), 1);
        // The editor follows only their own posts, until they choose.
        assert.lengthOf(yield* noticesOf(editorMember), 0);
        assert.lengthOf(yield* noticesOf(other), 0);

        assert.strictEqual(yield* deliver(request.key), 0);
        assert.lengthOf(yield* sentTo(author.email), 1);
      })
  );

  it.effect(
    "tell the members who chose every post about another member's post",
    () =>
      Effect.gen(function* toFollowers() {
        const { people, workspaceId } = yield* workspaceWith([
          { locale: "en", permissions: contributor },
          { locale: "en", permissions: editor },
          // Follows every post, but may not act on one.
          { locale: "en", permissions: viewer },
        ]);

        const [author, follower, watcher] = people;

        assert(
          author !== undefined &&
            follower !== undefined &&
            watcher !== undefined
        );

        yield* Effect.forEach([follower, watcher], (person) =>
          NotificationSettings.use((settings) =>
            settings.change(readerOf(person.userId), { everyPost: true })
          )
        );

        const request = yield* failedPost(workspaceId);

        yield* Notify.use((notify) =>
          notify.notify({ ...request, author: author.userId })
        );

        assert.lengthOf(yield* noticesOf(author), 1);
        assert.lengthOf(yield* noticesOf(follower), 1);
        assert.lengthOf(yield* noticesOf(watcher), 0);
      })
  );

  it.effect(
    "resolve an event: its notices are read, and its emails never go",
    () =>
      Effect.gen(function* resolves() {
        const { people, workspaceId } = yield* workspaceWith([
          { locale: "en", permissions: editor },
          { locale: "fr", permissions: owner },
        ]);

        const [ada, chloe] = people;

        assert(ada !== undefined && chloe !== undefined);

        const notify = yield* Notify;
        const request = yield* failedPost(workspaceId);
        const untouched = yield* failedPost(workspaceId);

        yield* notify.notify(request);
        yield* notify.notify(untouched);
        yield* notify.resolve(request.key);

        const [readAda, readChloe] = yield* Effect.forEach(
          [ada, chloe],
          (person) =>
            noticesOf(person).pipe(
              Effect.map((notices) =>
                notices.map(({ readAt }) => Option.isSome(readAt))
              )
            )
        );

        // Newest first: the untouched event, then the resolved one.
        assert.deepStrictEqual(readAda, [false, true]);
        assert.deepStrictEqual(readChloe, [false, true]);

        assert.strictEqual(yield* deliver(request.key), 0);
        assert.lengthOf(yield* sentTo(ada.email), 0);
        assert.lengthOf(yield* sentTo(chloe.email), 0);
      })
  );

  it.effect(
    "keep an email the transport refused for now, and drop one refused for good",
    () =>
      Effect.gen(function* refusals() {
        const { people, workspaceId } = yield* workspaceWith([
          { locale: "en", permissions: editor },
        ]);

        const [ada] = people;

        assert(ada !== undefined);

        const mailer = yield* TestMailer;
        const notify = yield* Notify;
        const later = yield* failedPost(workspaceId);
        const never = yield* failedPost(workspaceId);

        yield* notify.notify(later);
        yield* notify.notify(never);

        yield* mailer.setMode("refuseForNow");
        assert.strictEqual(yield* deliver(later.key), 1);

        yield* mailer.setMode("refuse");
        assert.strictEqual(yield* deliver(never.key), 0);

        yield* mailer.setMode("accept");
        assert.strictEqual(yield* deliver(later.key), 0);
        assert.strictEqual(yield* deliver(never.key), 0);

        assert.lengthOf(yield* sentTo(ada.email), 1);
      })
  );

  it.effect("write each email when it goes, to whoever still wants it", () =>
    Effect.gen(function* atDelivery() {
      const { people, workspaceId } = yield* workspaceWith([
        { locale: "en", permissions: editor },
        { locale: "en", permissions: editor },
        { locale: "en", permissions: editor },
      ]);

      const [ada, bea, cleo] = people;

      assert(ada !== undefined && bea !== undefined && cleo !== undefined);

      const request = yield* failedPost(workspaceId);

      yield* Notify.use((notify) => notify.notify(request));

      // Before it goes: Ada now reads French, Bea left, Cleo turned it off.
      yield* TestDirectory.use((directory) =>
        directory.setMembers(workspaceId, [{ ...ada, locale: "fr" }, cleo])
      );
      yield* NotificationSettings.use((settings) =>
        settings.change(readerOf(cleo.userId), {
          email: { postFailed: false },
        })
      );

      assert.strictEqual(yield* deliver(request.key), 0);

      assert.deepStrictEqual(
        (yield* sentTo(ada.email)).map(({ subject }) => subject),
        ["Une publication n’est pas partie sur Mastodon (@acme_example)"]
      );
      assert.lengthOf(yield* sentTo(bea.email), 0);
      assert.lengthOf(yield* sentTo(cleo.email), 0);
    })
  );

  it.effect("give up on emails still refused after the last try", () =>
    Effect.gen(function* abandons() {
      const { people, workspaceId } = yield* workspaceWith([
        { locale: "en", permissions: editor },
      ]);

      const [ada] = people;

      assert(ada !== undefined);

      const request = yield* failedPost(workspaceId);
      const emails = yield* DeliverNoticeEmails;

      yield* Notify.use((notify) => notify.notify(request));
      yield* emails.abandon(request.key);
      assert.strictEqual(yield* emails.deliver(request.key), 0);
      assert.lengthOf(yield* sentTo(ada.email), 0);
    })
  );
});

layer(Test)("a user's notices", (it) => {
  const fourNotices = Effect.gen(function* fourNotices() {
    const { people, workspaceId } = yield* workspaceWith([
      { locale: "en", permissions: editor },
      { locale: "en", permissions: editor },
    ]);

    const [ada, bea] = people;

    assert(ada !== undefined && bea !== undefined);

    const requests = yield* Effect.all(
      [1, 2, 3, 4].map(() => failedPost(workspaceId))
    );

    yield* Effect.all(
      requests.map((request) => Notify.use((notify) => notify.notify(request)))
    );

    return { ada, bea };
  });

  it.effect("come newest first, a page at a time", () =>
    Effect.gen(function* pages() {
      const { ada } = yield* fourNotices;
      const inbox = yield* NoticeInbox;
      const reader = readerOf(ada.userId);

      const first = yield* inbox.page(reader, {
        after: Option.none(),
        limit: 3,
      });

      assert.lengthOf(first.items, 3);
      assert.isTrue(Option.isSome(first.next));

      const second = yield* inbox.page(reader, { after: first.next, limit: 3 });

      assert.lengthOf(second.items, 1);
      assert.isTrue(Option.isNone(second.next));

      const ids = [...first.items, ...second.items].map(({ id }) => id);

      assert.deepStrictEqual(ids, ids.toSorted().toReversed());
    })
  );

  it.effect("are marked read by their reader only", () =>
    Effect.gen(function* marks() {
      const { ada, bea } = yield* fourNotices;
      const inbox = yield* NoticeInbox;

      const [newest, next] = (yield* inbox.page(readerOf(ada.userId), {
        after: Option.none(),
        limit: 2,
      })).items;

      assert(newest !== undefined && next !== undefined);

      // Ada's ids name nothing of Bea's.
      assert.strictEqual(
        yield* inbox.markRead(readerOf(bea.userId), [newest.id]),
        4
      );
      assert.strictEqual(
        yield* inbox.markRead(readerOf(ada.userId), [newest.id, next.id]),
        2
      );
      assert.strictEqual(yield* inbox.unread(readerOf(ada.userId)), 2);
      assert.strictEqual(yield* inbox.markAllRead(readerOf(ada.userId)), 0);
      assert.strictEqual(yield* inbox.unread(readerOf(bea.userId)), 4);

      const read = yield* noticesOf(ada);

      assert.isTrue(read.every(({ readAt }) => Option.isSome(readAt)));
    })
  );

  it.effect("are only read by staff impersonating their reader", () =>
    Effect.gen(function* impersonated() {
      const { ada } = yield* fourNotices;
      const inbox = yield* NoticeInbox;
      const staff = readerOf(ada.userId, { impersonated: true });

      assert.strictEqual(yield* inbox.unread(staff), 4);

      const refused = yield* Effect.flip(inbox.markAllRead(staff));

      assert.strictEqual(refused._tag, "InboxAccessDenied");
      assert.strictEqual(yield* inbox.unread(readerOf(ada.userId)), 4);

      const settings = yield* NotificationSettings;

      assert.strictEqual(
        (yield* Effect.flip(
          settings.change(staff, { email: { postFailed: false } })
        ))._tag,
        "InboxAccessDenied"
      );
    })
  );
});
