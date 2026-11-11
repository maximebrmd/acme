import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Option, Schema } from "effect";
import { OpenApi } from "effect/http-api";
import { Api } from "peal-contract";

// The clients generated from the OpenAPI document read a plain `integer`
// into 32 bits (Java, .NET, Rust, Go): a count of bytes, which passes 2^31
// for a video or a workspace's storage, must say `int64` there.

const isArray = Schema.is(Schema.Array(Schema.Json));
const isObject = Schema.is(Schema.Record(Schema.String, Schema.Json));
const decodeText = Schema.decodeUnknownOption(Schema.String);

interface Found {
  /** The object schema's properties, by name. */
  readonly among: readonly string[];
  /** The integer's format; empty when it names none. */
  readonly format: string;
  /** Where the schema is, from the document's root. */
  readonly path: readonly string[];
  readonly property: string;
}

// The integer a schema is, or may be when it may also be null.
const integerOf = (
  schema: Schema.JsonObject
): Option.Option<Schema.JsonObject> => {
  if (schema["type"] === "integer") {
    return Option.some(schema);
  }

  const { anyOf } = schema;

  return Arr.findFirst(
    (isArray(anyOf) ? anyOf : []).flatMap((member) =>
      isObject(member) ? [member] : []
    ),
    (member) => member["type"] === "integer"
  );
};

// Every integer property of every object schema in the document.
const integersIn = (
  node: Schema.Json,
  path: readonly string[] = []
): readonly Found[] => {
  if (isArray(node)) {
    return node.flatMap((item, index) =>
      integersIn(item, [...path, String(index)])
    );
  }

  if (!isObject(node)) {
    return [];
  }

  const { properties } = node;

  const own = isObject(properties)
    ? Object.entries(properties).flatMap(([property, schema]) =>
        (isObject(schema) ? integerOf(schema) : Option.none()).pipe(
          Option.map((integer) => ({
            among: Object.keys(properties),
            format: Option.getOrElse(decodeText(integer["format"]), () => ""),
            path,
            property,
          })),
          Option.toArray
        )
      )
    : [];

  return [
    ...own,
    ...Object.entries(node).flatMap(([key, value]) =>
      integersIn(value, [...path, key])
    ),
  ];
};

// The document as the docs and the SDKs' generators read it: JSON.
const integers = integersIn(
  Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Json))(
    JSON.stringify(OpenApi.fromApi(Api))
  )
);

const byteNames = new Set([
  "byteSize",
  "maxByteSize",
  "mediaStorage",
  "minByteSize",
]);

// What an object that weighs a file bounds it with.
const boundNames = new Set(["maxByteSize", "maximum", "minimum"]);

// What a plan allows and a workspace holds: bytes, for media storage.
const quantityNames = new Set(["allowed", "used"]);

const where = ({ path, property }: Found) => `${path.join("/")}/${property}`;

describe("the integers of the OpenAPI document", () => {
  it("are found, by the hundreds", () => {
    expect(integers.length).toBeGreaterThan(100);
  });

  it("are 64-bit wherever they count bytes", () => {
    const sizes = integers.filter(({ property }) => byteNames.has(property));

    expect(sizes.length).toBeGreaterThan(10);
    expect(
      sizes.filter(({ format }) => format !== "int64").map(where)
    ).toStrictEqual([]);
  });

  it("are 64-bit for the limits beside a file's size, as a video's 2 GiB", () => {
    const bounds = integers.filter(
      ({ among, property }) =>
        among.includes("byteSize") && boundNames.has(property)
    );

    expect(bounds.length).toBeGreaterThan(2);
    expect(
      bounds.filter(({ format }) => format !== "int64").map(where)
    ).toStrictEqual([]);
  });

  it("are 64-bit for what a plan allows and a workspace holds, which media storage counts in bytes", () => {
    const quantities = integers.filter(
      ({ among, property }) =>
        among.includes("limit") && quantityNames.has(property)
    );

    expect(quantities.length).toBeGreaterThan(2);
    expect(
      quantities.filter(({ format }) => format !== "int64").map(where)
    ).toStrictEqual([]);
  });

  it("say int64 for nothing a 32-bit integer holds by its own bounds", () => {
    // A check that the format is chosen, not sprinkled: no count of items,
    // pixels or milliseconds takes it.
    expect(
      [
        ...new Set(
          integers
            .filter(({ format }) => format === "int64")
            .map(({ property }) => property)
            .filter(
              (property) =>
                !byteNames.has(property) &&
                !boundNames.has(property) &&
                !quantityNames.has(property)
            )
        ),
      ].toSorted((left, right) => left.localeCompare(right))
    ).toStrictEqual([
      // Ads: money in a currency's minor units, which passes 2^31 for a
      // budget in a currency without cents, and what ads did summed over
      // days and campaigns.
      "amount",
      "amountSpent",
      // A plan's allowances, limit by limit; `mediaStorage` among them.
      "assistantRequests",
      "budgetAmount",
      "capRoom",
      "ceiling",
      // A usage report's channels added up over its days: a base a price
      // multiplies, which sums across a partner's workspaces too.
      "channelDays",
      "channels",
      "clicks",
      "commitment",
      "committed",
      "committedThisMonth",
      "dailyBudget",
      "impressions",
      "members",
      "monthlyCeiling",
      // An exported usage count, whose media storage is in bytes.
      "quantity",
      "reach",
      "requested",
      "results",
      "room",
      "scheduledPosts",
      "spend",
      "spendCap",
      "totalBudget",
    ]);
  });
});
