import { Effect, FileSystem, Path, Stream } from "effect";
import type { HttpClientError } from "effect/http";

import { Refused } from "#refused.ts";

/**
 * Saves a file the API streams to `output`, which must not exist yet:
 * written as it comes beside the file, to one made for it alone, never
 * through a link nor over a file made since it was checked, and named
 * `output` only once every byte came, so a file cut off on the way leaves
 * nothing that looks complete. Answers the file's whole path.
 */
export const saveNew = Effect.fn("saveNew")(function* saveNew<E>(
  output: string,
  flag: string,
  open: Effect.Effect<
    Stream.Stream<Uint8Array, HttpClientError.HttpClientError>,
    E
  >
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const file = path.resolve(output);

  const cannotSave = (failure: { readonly message: string }) =>
    new Refused({ reason: `Cannot save ${file} (${failure.message}).` });

  if (yield* fs.exists(file).pipe(Effect.mapError(cannotSave))) {
    return yield* new Refused({
      reason: `${file} exists already: give another ${flag}.`,
    });
  }

  const rows = yield* open;
  const partial = `${file}.partial`;
  const discard = fs.remove(partial).pipe(Effect.catch(() => Effect.void));

  yield* rows.pipe(
    Stream.run(fs.sink(partial, { flag: "wx" })),
    Effect.catchTags({
      HttpClientError: (failure) =>
        discard.pipe(
          Effect.andThen(
            Effect.fail(
              new Refused({
                reason: `The export was cut off before its end (${failure.message}): nothing was saved. Run the command again.`,
              })
            )
          )
        ),
      PlatformError: (failure) =>
        discard.pipe(Effect.andThen(Effect.fail(cannotSave(failure)))),
    })
  );

  yield* fs
    .link(partial, file)
    .pipe(Effect.mapError(cannotSave), Effect.ensuring(discard));

  return file;
});
