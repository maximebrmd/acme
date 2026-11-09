import { describe, expect, it } from "@effect/vitest";
import {
  AltTextTooLong,
  Forbidden,
  MediaNotFound,
  MediaStoreUnavailable,
  MediaTooLarge,
  Unauthenticated,
  UnsupportedMediaType,
  UploadIncomplete,
  UploadRejected,
  WorkspaceNotFound,
} from "acme-contract";

import { failureOf } from "#media/upload-api.ts";
import { UploadFailed } from "#media/upload-failed.ts";

describe(failureOf, () => {
  it.each([
    [new Forbidden(), "forbidden"],
    [new MediaStoreUnavailable(), "storeUnavailable"],
    [new Unauthenticated(), "signedOut"],
    [
      new UnsupportedMediaType({ contentType: "image/svg+xml" }),
      "unsupportedType",
    ],
    [new UploadIncomplete(), "incomplete"],
    [new UploadRejected({ reason: "sizeMismatch" }), "rejectedSize"],
    [new UploadRejected({ reason: "typeMismatch" }), "rejectedType"],
    [new WorkspaceNotFound(), "workspaceNotFound"],
    [new MediaNotFound(), "unexpected"],
  ] as const)("explains %o as %s", (answer, reason) => {
    expect(failureOf(answer)).toStrictEqual(new UploadFailed({ reason }));
  });

  it("gives the limit a file or a description went past", () => {
    expect(
      failureOf(
        new MediaTooLarge({
          byteSize: 20_000_000,
          kind: "image",
          maxByteSize: 16_777_216,
        })
      )
    ).toStrictEqual(
      new UploadFailed({ limit: 16_777_216, reason: "tooLarge" })
    );
    expect(failureOf(new AltTextTooLong({ maxLength: 2000 }))).toStrictEqual(
      new UploadFailed({ limit: 2000, reason: "altTextTooLong" })
    );
  });
});
