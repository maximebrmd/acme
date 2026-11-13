import { describe, expect, it } from "@effect/vitest";
import { Context } from "effect";
import { HttpApi } from "effect/http-api";
import { Api } from "peal-contract";

describe("the search of the library", () => {
  it("keeps its text out of the request's span, as it is part of a name", () => {
    const group = Api.groups.media;

    expect(
      Context.getOrUndefined(
        group.endpoints.list.annotations,
        HttpApi.RedactedNames
      )?.query
    ).toContain("q");
  });
});
