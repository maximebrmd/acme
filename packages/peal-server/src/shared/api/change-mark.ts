import { Context, Effect, Option, Ref } from "effect";

/**
 * Whether the request being handled turned out to change nothing, though
 * its method says it might: a dry run reads, checks and answers. Its
 * handler says so here, first thing, and what keeps a record of changes
 * (the activity log, the journal of connections that changed content)
 * leaves it out. The authentication middleware provides it; a request that
 * says nothing is taken to change something.
 */
export class ChangeMark extends Context.Service<
  ChangeMark,
  {
    /** Whether the handler said the request changes nothing. */
    readonly changedNothing: Effect.Effect<boolean>;
    /** Says the request changes nothing. */
    readonly changesNothing: Effect.Effect<void>;
  }
>()("peal-server/shared/api/ChangeMark") {}

/** A mark for one request, which nothing has said anything of yet. */
export const makeChangeMark = Ref.make(false).pipe(
  Effect.map((marked) =>
    ChangeMark.of({
      changedNothing: Ref.get(marked),
      changesNothing: Ref.set(marked, true),
    })
  )
);

/**
 * Says the request being handled changes nothing. Nothing happens in a
 * test that serves handlers alone.
 */
export const changesNothing = Effect.serviceOption(ChangeMark).pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.void,
      onSome: (mark) => mark.changesNothing,
    })
  )
);

/** Whether the request's handler said it changes nothing. */
export const changedNothing = Effect.serviceOption(ChangeMark).pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.succeed(false),
      onSome: (mark) => mark.changedNothing,
    })
  )
);
