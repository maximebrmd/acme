import { Option } from "effect";
import { describe, expect, it } from "vitest";

import { databaseNameOf } from "#shared/infrastructure/database-name.ts";

describe("the database a URL names", () => {
  it("is its path, whatever its query says", () => {
    expect(
      databaseNameOf("postgres://peal:peal@127.0.0.1:15432/peal_scale")
    ).toStrictEqual(Option.some("peal_scale"));
    expect(
      databaseNameOf(
        "postgres://peal:peal@127.0.0.1:15432/peal?application_name=scale"
      )
    ).toStrictEqual(Option.some("peal"));
    expect(
      databaseNameOf("postgres://peal:peal@127.0.0.1/peal_scale?sslmode=off")
    ).toStrictEqual(Option.some("peal_scale"));
    expect(
      databaseNameOf("postgres://peal:peal@127.0.0.1/peal%5Fscale")
    ).toStrictEqual(Option.some("peal_scale"));
  });

  it("is none when the URL names none, or is no URL", () => {
    expect(
      databaseNameOf("postgres://peal:peal@127.0.0.1:15432")
    ).toStrictEqual(Option.none());
    expect(databaseNameOf("postgres://peal@127.0.0.1/")).toStrictEqual(
      Option.none()
    );
    expect(databaseNameOf("")).toStrictEqual(Option.none());
    expect(databaseNameOf("scale")).toStrictEqual(Option.none());
  });
});
