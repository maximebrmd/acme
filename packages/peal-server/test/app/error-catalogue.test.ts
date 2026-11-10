import { readFileSync, writeFileSync } from "node:fs";

import { Schema } from "effect";
import { OpenApi } from "effect/http-api";
import { Api } from "peal-contract";
import { errorCatalogue, errorCodeOf } from "peal-contract/errors";
import { describe, expect, it } from "vitest";

// The codes published so far, with the tag and status each was published
// with. Run with UPDATE_ERROR_CODES=1 to add the new ones; never remove or
// change one: clients match on them.
const published = new URL("fixtures/error-codes.json", import.meta.url);

const PublishedSchema = Schema.fromJsonString(
  Schema.Array(
    Schema.Struct({
      code: Schema.String,
      status: Schema.Number,
      tag: Schema.String,
    })
  )
);

const catalogue = errorCatalogue();

const current = catalogue.map(({ code, status, tag }) => ({
  code,
  status,
  tag,
}));

// The OpenAPI document, as far as this test reads it.
const DocumentSchema = Schema.fromJsonString(
  Schema.Struct({
    components: Schema.Struct({
      schemas: Schema.Record(Schema.String, Schema.Json),
    }),
    paths: Schema.Record(
      Schema.String,
      Schema.Record(
        Schema.String,
        Schema.Struct({
          responses: Schema.Record(
            Schema.String,
            Schema.Struct({
              content: Schema.optionalKey(
                Schema.Record(
                  Schema.String,
                  Schema.Struct({ schema: Schema.Json })
                )
              ),
            })
          ),
        })
      )
    ),
  })
);

const ErrorSchema = Schema.Struct({
  properties: Schema.StructWithRest(
    Schema.Struct({
      _tag: Schema.Struct({ enum: Schema.Tuple([Schema.String]) }),
    }),
    [Schema.Record(Schema.String, Schema.Json)]
  ),
});

const decodeReference = Schema.decodeUnknownOption(
  Schema.Struct({ $ref: Schema.String })
);

const decodeUnion = Schema.decodeUnknownOption(
  Schema.Struct({ anyOf: Schema.Array(Schema.Json) })
);

// Effect's own status errors, which endpoints declare for a value they
// cannot use: the server gives them the envelope of the general errors.
const statusErrors = new Set(["BadRequest", "NotFound"]);

const envelope = ["code", "message", "requestId"];

describe("the error catalogue", () => {
  it("turns a tag into its code", () => {
    expect(errorCodeOf("PostNotFound")).toBe("post_not_found");
    expect(errorCodeOf("OAuthClientNotPublished")).toBe(
      "oauth_client_not_published"
    );
    expect(errorCodeOf("Forbidden")).toBe("forbidden");
  });

  it("gives every error one code, in snake case, with words for a person", () => {
    const codes = catalogue.map(({ code }) => code);

    expect(new Set(codes).size).toBe(codes.length);

    for (const { code, message } of catalogue) {
      expect(code).toMatch(/^[a-z][a-z\d]*(?:_[a-z\d]+)*$/u);
      expect(message.length).toBeGreaterThan(10);
    }

    expect(codes).toContain("invalid_request");
    expect(codes).toContain("bad_request");
    expect(codes).toContain("not_found");
    expect(codes).toContain("internal_error");
  });

  it("keeps every code published so far, with its tag and status", () => {
    if (process.env["UPDATE_ERROR_CODES"] === "1") {
      writeFileSync(published, `${JSON.stringify(current, null, 2)}\n`);
    }

    const before = Schema.decodeUnknownSync(PublishedSchema)(
      readFileSync(published, "utf-8")
    );

    // Nothing published was removed, renamed or moved to another status,
    // and a new error is published by adding it to the fixture.
    expect(current).toStrictEqual(before);
  });

  it("declares the envelope on every error the API documents", () => {
    const document = Schema.decodeUnknownSync(DocumentSchema)(
      JSON.stringify(OpenApi.fromApi(Api))
    );

    const resolve = (schema: Schema.Json): readonly Schema.Json[] => {
      const reference = decodeReference(schema);

      if (reference._tag === "Some") {
        const name = reference.value.$ref.split("/").at(-1) ?? "";

        return resolve(document.components.schemas[name] ?? null);
      }

      const union = decodeUnion(schema);

      return union._tag === "Some"
        ? union.value.anyOf.flatMap(resolve)
        : [schema];
    };

    const errors = Object.values(document.paths)
      .flatMap((path) => Object.values(path))
      .flatMap(({ responses }) => Object.entries(responses))
      .filter(([status]) => Number(status) >= 400)
      .flatMap(([, { content }]) => Object.values(content ?? {}))
      .flatMap(({ schema }) => resolve(schema))
      .map((schema) => Schema.decodeUnknownSync(ErrorSchema)(schema))
      .map(({ properties }) => ({
        fields: Object.keys(properties),
        tag: properties._tag.enum[0],
      }));

    expect(errors.length).toBeGreaterThan(100);

    // Every tag has its entry in the catalogue.
    const tags = new Set(catalogue.map(({ tag }) => tag));

    expect(errors.filter(({ tag }) => !tags.has(tag))).toStrictEqual([]);

    expect(
      errors.filter(
        ({ fields, tag }) =>
          !statusErrors.has(tag) &&
          !envelope.every((field) => fields.includes(field))
      )
    ).toStrictEqual([]);
  });

  // The docs' "API conventions" page lists every code, in each language,
  // in its section #error-codes: a row of the table starts with the code,
  // in backticks.
  it.each(["docs/api-conventions.mdx", "docs/fr/api-conventions.mdx"])(
    "is listed whole in %s",
    (page) => {
      const text = readFileSync(
        new URL(`../../../peal-docs/${page}`, import.meta.url),
        "utf-8"
      );

      // The section pinned as #error-codes, up to the next one.
      const [, section = ""] =
        /\[#error-codes\]\n(?<rows>[\s\S]*?)(?:\n## |$)/u.exec(text) ?? [];

      const listed = new Set(
        [...section.matchAll(/^\| `(?<code>[a-z\d_]+)`/gmu)].map(
          (row) => row.groups?.["code"] ?? ""
        )
      );

      expect(
        catalogue.map(({ code }) => code).filter((code) => !listed.has(code))
      ).toStrictEqual([]);

      // And nothing the API does not answer.
      const known = new Set(catalogue.map(({ code }) => code));

      expect([...listed].filter((code) => !known.has(code))).toStrictEqual([]);
    }
  );
});
