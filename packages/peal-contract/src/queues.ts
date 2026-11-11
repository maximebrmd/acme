import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { ChannelSetNotFound } from "./channel-set-not-found.ts";
import { Forbidden } from "./forbidden.ts";
import { InvalidTimeZone } from "./invalid-time-zone.ts";
import { QueueHasNoRoom, QueueNoRoomSchema } from "./queue-has-no-room.ts";
import { QueueNameTaken } from "./queue-name-taken.ts";
import { QueueNotFound } from "./queue-not-found.ts";
import { TooManyQueues } from "./too-many-queues.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** The longest name a queue has. */
export const maxQueueNameLength = 60;

/** The most slots one queue's week holds. */
export const maxSlotsPerQueue = 100;

/** The most channels one queue is for. */
export const maxChannelsPerQueue = 50;

/** The most queues a workspace keeps, whatever its plan. */
export const maxQueuesPerWorkspace = 20;

/** How far ahead a post added to a queue looks for a free slot, in days. */
export const queueHorizonDays = 366;

/** The most slots a preview lists. */
export const maxQueuePreview = 50;

/** The slots a preview lists unless `count` says otherwise. */
export const defaultQueuePreview = 10;

/** The days of the week, as a slot names them. */
export const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** A day of the week. */
export const WeekdaySchema = Schema.Literals(weekdays).annotate({
  identifier: "Weekday",
});

export type Weekday = typeof WeekdaySchema.Type;

/** A time of day to the minute, on a 24-hour clock: `09:30`. */
export const SlotTimeSchema = Schema.String.check(
  Schema.isPattern(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, {
    expected: "a time of day as HH:mm, such as 09:30",
  })
).annotate({ identifier: "SlotTime" });

/** A time of the queue's week: a weekday and a wall-clock time. */
export const QueueSlotSchema = Schema.Struct({
  day: WeekdaySchema,
  time: SlotTimeSchema,
}).annotate({ identifier: "QueueSlot" });

export type QueueSlot = typeof QueueSlotSchema.Type;

const QueueNameSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxQueueNameLength),
  Schema.makeFilter((name: string) => name === name.trim(), {
    expected: "a name without spaces around it",
  }),
  Schema.makeFilter((name: string) => !/\p{Cc}/u.test(name), {
    expected: "a name on one line, without control characters",
  })
);

/**
 * A workspace's queue: a weekly timetable of slots in a time zone, for
 * some channels and at most one channel set. A post added to it takes its
 * next free slot.
 */
export const QueueSchema = Schema.Struct({
  // The channels a post added to it goes to when it names none, as saved.
  channelIds: Schema.Array(Schema.String),
  // The channel set such a post goes to as well; null when none.
  channelSetId: Schema.NullOr(Schema.String),
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  // Whether a post added to no queue in particular takes this one.
  isDefault: Schema.Boolean,
  name: Schema.String,
  // Its week, by day and time.
  slots: Schema.Array(QueueSlotSchema),
  // The IANA zone its slots are wall-clock times of.
  timeZone: Schema.String,
  // Those of `channelIds` disconnected since: a post that takes the
  // queue's channels skips them, and says so.
  unavailableChannelIds: Schema.Array(Schema.String),
}).annotate({ identifier: "Queue" });

export type Queue = typeof QueueSchema.Type;

const slotKeyOf = ({ day, time }: QueueSlot) => `${day}@${time}`;

/** A queue, as a member writes it. */
export const QueueDetailsSchema = Schema.Struct({
  // Left out, none: a post added to it then names its channels.
  channelIds: Schema.optionalKey(
    Schema.Array(Schema.String).check(
      Schema.isMaxLength(maxChannelsPerQueue),
      Schema.makeFilter(
        (channelIds: readonly string[]) =>
          new Set(channelIds).size === channelIds.length,
        { expected: "each channel once" }
      )
    )
  ),
  // Left out, none.
  channelSetId: Schema.optionalKey(Schema.String),
  // True to make it the workspace's default queue, instead of the one that
  // was. Left out, false; the first queue of a workspace is its default.
  isDefault: Schema.optionalKey(Schema.Boolean),
  name: QueueNameSchema,
  slots: Schema.Array(QueueSlotSchema).check(
    Schema.isMaxLength(maxSlotsPerQueue),
    Schema.makeFilter(
      (slots: readonly QueueSlot[]) =>
        new Set(slots.map(slotKeyOf)).size === slots.length,
      { expected: "each day and time once" }
    )
  ),
  // An IANA zone, such as Europe/Paris, kept as written.
  timeZone: Schema.String,
}).annotate({ identifier: "QueueDetails" });

export type QueueDetails = typeof QueueDetailsSchema.Type;

/** A coming slot of a queue, and the post that holds it, if one does. */
export const PreviewSlotSchema = Schema.Struct({
  at: Schema.DateTimeUtc,
  postId: Schema.NullOr(Schema.String),
}).annotate({ identifier: "PreviewSlot" });

export type PreviewSlot = typeof PreviewSlotSchema.Type;

/**
 * A queue's coming slots, and the slot a post added now would take
 * (`nextFree`), or why there is none (`noRoom`). Advice: the slot is
 * decided when a post is added.
 */
export const QueuePreviewSchema = Schema.Struct({
  nextFree: Schema.NullOr(Schema.DateTimeUtc),
  noRoom: Schema.NullOr(QueueNoRoomSchema),
  slots: Schema.Array(PreviewSlotSchema),
}).annotate({ identifier: "QueuePreview" });

export type QueuePreview = typeof QueuePreviewSchema.Type;

/**
 * Why a reshuffle stopped before every waiting post was on its slot:
 * `planLimit`, a month the plan has no room in; `full`, no slot left
 * within the horizon; `changed`, the queue's timetable was saved, or the
 * queue deleted, while it ran.
 */
export const ReshuffleStopSchema = Schema.Literals([
  "planLimit",
  "full",
  "changed",
]).annotate({ identifier: "ReshuffleStop" });

export type ReshuffleStop = typeof ReshuffleStopSchema.Type;

/**
 * What a reshuffle did: posts moved onto their slots, posts left where
 * they were (already on their slots, not the caller's to move, or changed
 * by someone else while it ran), and posts not placed when it stopped,
 * with why (`stoppedBy`, null when it went through).
 */
export const QueueReshuffleSchema = Schema.Struct({
  moved: Schema.Int,
  remaining: Schema.Int,
  stoppedBy: Schema.NullOr(ReshuffleStopSchema),
  unchanged: Schema.Int,
}).annotate({ identifier: "QueueReshuffle" });

export type QueueReshuffle = typeof QueueReshuffleSchema.Type;

const workspace = { workspaceId: Schema.String };

const queue = { ...workspace, queueId: Schema.String };

const details = `A slot is a weekday and a time of day (\`HH:mm\`) in the queue's IANA time zone, each pair once, ${maxSlotsPerQueue} at most: a time daylight saving skips moves to the moment the clocks jump, and a time it repeats happens once. A queue may be for some of the workspace's channels (\`channelIds\`, connected ones, ${maxChannelsPerQueue} at most) and one channel set (\`channelSetId\`), which a post added to it goes to when it names none. Its name is one no other queue of the workspace has, whatever its case. \`isDefault\` makes it the workspace's default queue, the one a post added to no queue in particular takes, instead of the one that was.`;

/**
 * A workspace's queues: weekly timetables a post is added to instead of
 * being given a time.
 */
export class QueuesApi extends HttpApiGroup.make("queues")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(QueueSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's queues, the default first, then by name, each with its slots, its channels and those of them disconnected since (`unavailableChannelIds`). Needs post:read and channel:read.",
        summary: "List queues",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        QueueNameTaken,
        TooManyQueues,
        UnknownChannels,
        ChannelSetNotFound,
        InvalidTimeZone,
      ],
      params: workspace,
      payload: QueueDetailsSchema,
      success: QueueSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Saves a queue. ${details} The first queue of a workspace is its default. A workspace keeps ${maxQueuesPerWorkspace} queues at most. Needs post:update and channel:read.`,
        summary: "Create a queue",
      })
    ),
    HttpApiEndpoint.get("get", "/:queueId", {
      error: [Forbidden, QueueNotFound],
      params: queue,
      success: QueueSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Answers with a queue of the workspace. Needs post:read and channel:read.",
        summary: "Get a queue",
      })
    ),
    HttpApiEndpoint.put("update", "/:queueId", {
      error: [
        Forbidden,
        QueueNotFound,
        QueueNameTaken,
        UnknownChannels,
        ChannelSetNotFound,
        InvalidTimeZone,
      ],
      params: queue,
      payload: QueueDetailsSchema,
      success: QueueSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Replaces a queue's name, zone, slots and channels: every channel must be connected now, so this is also how a disconnected one is taken out. ${details} Posts the queue placed keep their times: a slot that changed frees nothing and moves nothing. Saving the default with \`isDefault\` false, or without \`isDefault\`, leaves the workspace without one, and a post then sent to the default queue is refused (QueueNotFound): send \`isDefault\` true to keep it the default. Needs post:update and channel:read.`,
        summary: "Update a queue",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:queueId", {
      error: [Forbidden, QueueNotFound],
      params: queue,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes a queue. The posts it placed stay scheduled at their times, and no longer name it (`queueId` null). Deleting the default leaves the workspace without one until another is made default. Needs post:update.",
        summary: "Delete a queue",
      })
    ),
    HttpApiEndpoint.get("slots", "/:queueId/slots", {
      error: [Forbidden, QueueNotFound],
      params: queue,
      query: {
        count: Schema.optionalKey(
          Schema.Int.check(
            Schema.isBetween({ maximum: maxQueuePreview, minimum: 1 })
          )
        ),
      },
      success: QueuePreviewSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Lists the queue's next \`count\` slots after now (${defaultQueuePreview} unless given, ${maxQueuePreview} at most), each with the post that holds it, or null, and \`nextFree\`, the slot a post added now would take, which may come after them; null with \`noRoom\` when there is none: the queue has no slot (\`noSlots\`), or every slot of the next ${queueHorizonDays} days is taken (\`full\`). A slot is taken while a post the queue placed is scheduled, awaiting approval or publishing at exactly that instant. The preview holds nothing: the slot is decided when the post is added. Needs post:read.`,
        summary: "Preview a queue's slots",
      })
    ),
    HttpApiEndpoint.post("reshuffle", "/:queueId/reshuffle", {
      error: [Forbidden, QueueNotFound, QueueHasNoRoom],
      params: queue,
      success: QueueReshuffleSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description: `Moves the posts that wait in the queue (scheduled or awaiting approval, after now) onto its slots as they are now, after its timetable changed: in the order of their times, the first onto the first free slot, and so on, those moved by hand included; a slot a publishing post holds is skipped. Each move is what moving a post by hand does (a new time, the month's room in the plan, and \`post.scheduled\` told for a scheduled post), but for approvals: a scheduled post goes through the approval policy as the caller's, and a post that waits for an approval keeps waiting, at its new time, whoever calls, under the request it had (\`post.approval_requested\` is told with the new time, and nobody is asked again to decide); moving it by hand is how a caller whose posts need no approval schedules it. A post already on its slot is left as it is. Answers how many posts moved, how many were left where they were (on their slots already, scheduled ones when the caller may only ask for posts to go out, or those moved, sent back or cancelled by someone else meanwhile), and how many remain unplaced: it stops, keeping what it moved, at a month the plan has no room in (\`stoppedBy\` \`planLimit\`), when no slot is left within ${queueHorizonDays} days (\`full\`), or when the queue was saved meanwhile (\`changed\`); call it again to go on. Called twice, the second call moves nothing. QueueHasNoRoom (\`noSlots\`) for a queue without slots. Needs post:schedule, or post:create where posts wait for an approval.`,
        summary: "Reshuffle a queue",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/queues") {}
