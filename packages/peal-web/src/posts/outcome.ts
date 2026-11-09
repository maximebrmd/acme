import { Cause, Exit, Option } from "effect";

/** The error a request failed with, if it failed with one it declares. */
export const failureOf = <A, E>(exit: Exit.Exit<A, E>): Option.Option<E> =>
  Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : Option.none();
