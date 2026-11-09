import { Effect, Layer, Option } from "effect";
import { MessageStorage, ShardingConfig } from "effect/cluster";

import { DeliverNoticeEmails } from "#notifications/application/deliver-notice-emails.ts";
import { NoticeInbox } from "#notifications/application/notice-inbox.ts";
import { NotificationSettings } from "#notifications/application/notification-settings.ts";
import { Notify } from "#notifications/application/notify.ts";
import { InboxReader } from "#notifications/domain/inbox-reader.ts";
import { DrizzleNoticeLog } from "#notifications/infrastructure/drizzle-notice-log.ts";
import { DrizzleNoticeStore } from "#notifications/infrastructure/drizzle-notice-store.ts";
import { DrizzlePreferenceStore } from "#notifications/infrastructure/drizzle-preference-store.ts";
import { PublicAppLinks } from "#notifications/infrastructure/public-app-links.ts";
import { Ids } from "#shared/application/ids.ts";
import { UserIdSchema } from "#shared/domain/ids.ts";
import type { UserId } from "#shared/domain/ids.ts";
import { TransactionRunnerLive } from "#shared/infrastructure/transaction-runner-live.ts";
import { DatabaseTest } from "#test/channels/support.ts";
import { StartedDeliveries } from "#test/notifications/started-deliveries.ts";
import { TestDirectory } from "#test/notifications/test-directory.ts";
import { TestMailer } from "#test/notifications/test-mailer.ts";

/** Transactions as the server runs them, over an in-memory message store. */
export const TransactionsTest = TransactionRunnerLive.pipe(
  Layer.provide(
    MessageStorage.layerMemory.pipe(Layer.provide(ShardingConfig.layer()))
  )
);

/**
 * The notices' use cases on the database, with a test directory and mailer,
 * and `delivery`, which provides NoticeDelivery. Needs a TransactionRunner,
 * Ids and the database.
 */
export const noticesWith = <ROut, E, R>(delivery: Layer.Layer<ROut, E, R>) =>
  Layer.mergeAll(
    Notify.layer,
    DeliverNoticeEmails.layer,
    NoticeInbox.layer,
    NotificationSettings.layer
  ).pipe(
    Layer.provideMerge(
      Layer.mergeAll(
        DrizzleNoticeLog,
        DrizzleNoticeStore,
        DrizzlePreferenceStore,
        PublicAppLinks,
        TestDirectory.layer,
        TestMailer.layer,
        delivery
      )
    )
  );

/**
 * The notices' use cases on Postgres, delivering emails when the test says
 * so.
 */
export const NoticesTest = noticesWith(StartedDeliveries.layer).pipe(
  Layer.provideMerge(TransactionsTest),
  Layer.provideMerge(DatabaseTest)
);

/** A user of their own for each test: notices outlive test runs. */
export const freshUser: Effect.Effect<UserId, never, Ids> = Ids.use((ids) =>
  ids.next.pipe(Effect.map((id) => UserIdSchema.make(id)))
);

/** The user, reading their own notices. */
export const readerOf = (
  userId: UserId,
  options: {
    readonly impersonated?: boolean;
    readonly oauth?: {
      readonly boundToWorkspace: boolean;
      readonly scopes: readonly string[];
    };
  } = {}
): InboxReader =>
  new InboxReader({
    impersonated: options.impersonated ?? false,
    oauth: Option.fromUndefinedOr(options.oauth),
    userId,
  });

/** The emails sent to the address, in order. */
export const sentTo = (address: string) =>
  TestMailer.use((mailer) => mailer.sent).pipe(
    Effect.map((sent) => sent.filter(({ to }) => to === address))
  );
