import { Context } from "effect";
import type { Effect } from "effect";

/** Names a subject in the counts without keeping who it is. */
export class SubjectDigest extends Context.Service<
  SubjectDigest,
  (subject: string) => Effect.Effect<string>
>()("peal-server/activity/application/SubjectDigest") {}
