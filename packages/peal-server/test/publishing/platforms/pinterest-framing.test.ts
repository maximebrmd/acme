import { assert, describe, expect, it } from "@effect/vitest";
import { DateTime, Effect, Option, Stream } from "effect";

import { isSamePin } from "#publishing/infrastructure/platforms/pinterest/pinterest-pin-match.ts";
import type {
  ListedPin,
  SentPin,
} from "#publishing/infrastructure/platforms/pinterest/pinterest-pin-match.ts";
import { uploadForm } from "#publishing/infrastructure/platforms/pinterest/upload-form.ts";

const since = DateTime.makeUnsafe("2026-03-01T10:00:00Z");

const sent: SentPin = {
  description: "Ripe tomatoes,  olive oil.\n",
  link: "https://Peal.example/recipes/",
  mediaType: "image",
  since,
  title: " Tomato salad",
};

const listed = (changes: Partial<ListedPin> = {}): ListedPin => ({
  createdAt: Option.some("2026-03-01T10:00:05+00:00"),
  description: "Ripe tomatoes, olive oil.",
  link: "https://peal.example/recipes",
  mediaType: Option.some("image"),
  title: "Tomato salad",
  ...changes,
});

describe(isSamePin, () => {
  it("takes a Pin made since with the same words, link and kind of media", () => {
    expect(isSamePin(sent, listed())).toBeTruthy();
    // Pinterest may not say what the Pin shows.
    expect(isSamePin(sent, listed({ mediaType: Option.none() }))).toBeTruthy();
    expect(
      isSamePin(
        { ...sent, description: "", link: "", title: "" },
        listed({ description: "", link: "", title: "" })
      )
    ).toBeTruthy();
  });

  it("leaves a Pin made before the attempt, or at a time it cannot read", () => {
    for (const createdAt of [
      Option.some("2026-03-01T09:59:59Z"),
      Option.some("yesterday"),
      Option.none<string>(),
    ]) {
      expect(isSamePin(sent, listed({ createdAt }))).toBeFalsy();
    }
  });

  it("leaves a Pin that differs in a word, its link or its media", () => {
    for (const other of [
      listed({ title: "Tomato salads" }),
      listed({ description: "Ripe tomatoes." }),
      listed({ link: "https://peal.example/recipes?page=2" }),
      listed({ link: "" }),
      listed({ mediaType: Option.some("video") }),
    ]) {
      expect(isSamePin(sent, other)).toBeFalsy();
    }
  });
});

describe(uploadForm, () => {
  it.effect("frames the fields, then the file, in the length it declares", () =>
    Effect.gen(function* framed() {
      const file = Uint8Array.from([0, 13, 10, 45, 45, 255]);

      const form = uploadForm({
        boundary: "peal-synthetic",
        fields: { key: "uploads/1", policy: "c3ludGhldGlj" },
        file: {
          byteSize: file.byteLength,
          bytes: Stream.make(file.subarray(0, 2), file.subarray(2)),
          contentType: "video/mp4",
          fileName: 'clip".mp4',
        },
      });

      const body = yield* Stream.mkUint8Array(form.body);
      const text = new TextDecoder("latin1").decode(body);

      assert.strictEqual(
        form.contentType,
        "multipart/form-data; boundary=peal-synthetic"
      );
      assert.strictEqual(body.byteLength, form.contentLength);
      assert.strictEqual(
        text,
        [
          "--peal-synthetic",
          'Content-Disposition: form-data; name="key"',
          "",
          "uploads/1",
          "--peal-synthetic",
          'Content-Disposition: form-data; name="policy"',
          "",
          "c3ludGhldGlj",
          "--peal-synthetic",
          'Content-Disposition: form-data; name="file"; filename="clip_.mp4"',
          "Content-Type: video/mp4",
          "",
          new TextDecoder("latin1").decode(file),
          "--peal-synthetic--",
          "",
        ].join("\r\n")
      );
    })
  );
});
