/**
 * What the server answers a path it refuses before routing
 * (`isRefusedPath`, `peal-contract/path-spelling`): `BadRequest`, which the
 * envelope completes.
 */
export const refusedPathError = {
  _tag: "BadRequest",
  message:
    "The path holds an encoded slash or backslash, or a dot segment: write each segment as it is. Nothing was done.",
} as const;
