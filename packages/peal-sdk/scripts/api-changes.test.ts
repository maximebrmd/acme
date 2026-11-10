import { describe, expect, it } from "bun:test";

import { Predicate, Schema as SchemaModule } from "effect";
import type { Schema } from "effect";

import { apiChanges, lineOf, operationCount } from "./api-changes.ts";

type JsonObject = Schema.JsonObject;

const reference = (name: string) => ({ $ref: `#/components/schemas/${name}` });

// A small API: posts are listed and created, and each has a status.
const released = (): JsonObject => ({
  components: {
    schemas: {
      NewPost: {
        properties: {
          status: { enum: ["draft", "scheduled"], type: "string" },
          text: { type: "string" },
        },
        required: ["text"],
        type: "object",
      },
      Post: {
        properties: {
          id: { type: "string" },
          status: { enum: ["draft", "scheduled"], type: "string" },
          text: { type: "string" },
        },
        required: ["id", "status", "text"],
        type: "object",
      },
    },
  },
  paths: {
    "/api/posts": {
      get: {
        operationId: "posts.list",
        parameters: [
          {
            in: "query",
            name: "from",
            required: true,
            schema: { type: "string" },
          },
          { in: "query", name: "limit", schema: { type: "integer" } },
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: { items: reference("Post"), type: "array" },
              },
            },
          },
          "404": {
            content: { "application/json": { schema: reference("Post") } },
          },
        },
      },
      post: {
        operationId: "posts.create",
        requestBody: {
          content: { "application/json": { schema: reference("NewPost") } },
          required: true,
        },
        responses: {
          "201": {
            content: { "application/json": { schema: reference("Post") } },
          },
        },
      },
    },
  },
});

type Json = Schema.Json;

const isObject = SchemaModule.is(SchemaModule.JsonObject);
const isArray = SchemaModule.is(SchemaModule.Array(SchemaModule.Json));

// A copy of a JSON value with what is at `path` replaced by what `change`
// makes of it; undefined removes it.
const edited = (
  value: Json | undefined,
  path: readonly string[],
  change: (found: Json | undefined) => Json | undefined
): Json | undefined => {
  const [key, ...rest] = path;

  if (key === undefined) {
    return change(value);
  }

  if (isArray(value)) {
    return value.flatMap((item, index) => {
      const next = String(index) === key ? edited(item, rest, change) : item;

      return next === undefined ? [] : [next];
    });
  }

  const holder = isObject(value) ? value : {};
  const next = edited(holder[key], rest, change);

  return Object.fromEntries([
    ...Object.entries(holder).filter(([name]) => name !== key),
    ...(next === undefined ? [] : [[key, next] as const]),
  ]);
};

type Editing = (found: Json | undefined) => Json | undefined;

// A place, and what becomes of it: a new value, nothing (undefined), or
// what an edit makes of the old one.
type Edit = readonly [path: string, change: Editing | Json | undefined];

// The released document with these places changed: a path is written with
// `>` between its keys.
const changed = (...edits: readonly Edit[]): JsonObject => {
  let document: Json | undefined = released();

  for (const [path, change] of edits) {
    document = edited(document, path.split(">"), (found) =>
      Predicate.isFunction(change) ? change(found) : change
    );
  }

  return isObject(document) ? document : {};
};

const adding =
  (...items: readonly Json[]): Editing =>
  (found) => [...(isArray(found) ? found : []), ...items];

const list = "paths>/api/posts>get";
const create = "paths>/api/posts>post";
const post = "components>schemas>Post";
const newPost = "components>schemas>NewPost";

// An answer that is a post or what makes one.
const either = (path: string): Edit => [
  `${path}>content>application/json>schema`,
  { anyOf: [reference("Post"), reference("NewPost")] },
];

// A member of a union, told apart by its tag.
const tagged = (tag: string, fields: JsonObject = {}): JsonObject => ({
  properties: Object.fromEntries([
    ...Object.entries(fields),
    ["_tag", { enum: [tag], type: "string" }],
  ]),
  required: ["_tag"],
  type: "object",
});

// The released document whose posts have a state, one of these.
const withState = (...members: readonly JsonObject[]) =>
  changed([`${post}>properties>state`, { anyOf: members }]);

const breaking = (after: JsonObject) =>
  apiChanges(released(), after)
    .filter(({ kind }) => kind === "breaking")
    .map(lineOf);

const others = (after: JsonObject) =>
  apiChanges(released(), after)
    .filter(({ kind }) => kind !== "breaking")
    .map(({ kind, what, where }) => `${kind}: ${where} ${what}`);

describe("changes between two documents of the API", () => {
  it("finds none between a document and itself", () => {
    expect(apiChanges(released(), released())).toEqual([]);
  });

  it("lets the API grow: operations, optional parameters, fields, values answered, errors", () => {
    const after = changed(
      [
        "paths>/api/posts/{id}",
        { get: { operationId: "posts.get", responses: {} } },
      ],
      [
        `${list}>parameters`,
        adding({ in: "query", name: "status", schema: { type: "string" } }),
      ],
      [`${list}>responses>429`, {}],
      [`${post}>properties>permalink`, { type: "string" }],
      [`${post}>properties>status>enum`, adding("published")],
      [`${newPost}>properties>note`, { type: "string" }],
      ["components>schemas>Media", { type: "object" }]
    );

    expect(breaking(after)).toEqual([]);
    expect(others(after)).toEqual([
      "addition: posts.list: query parameter status is new, and optional",
      "addition: posts.list: 429 answer is new",
      "addition: posts.get is a new operation (GET /api/posts/{id})",
      "addition: NewPost.note is new, and optional",
      'addition: Post.status may answer the value "published"',
      "addition: Post.permalink is new in the answer",
      "addition: Media is a new schema",
    ]);
  });

  it("refuses an operation that goes, or changes its name", () => {
    expect(
      breaking(
        changed([create, undefined], [`${list}>operationId`, "posts.search"])
      )
    ).toEqual([
      "posts.list is now called posts.search: the SDKs' method changes name",
      "posts.create is gone (POST /api/posts)",
    ]);
  });

  it("refuses asking clients for more than they send today", () => {
    expect(
      breaking(
        changed(
          [`${list}>parameters>1>required`, true],
          [
            `${list}>parameters`,
            adding({
              in: "query",
              name: "zone",
              required: true,
              schema: { type: "string" },
            }),
          ],
          [`${list}>parameters>0`, undefined],
          [`${newPost}>properties>channel`, { type: "string" }],
          [`${newPost}>required`, adding("status", "channel")],
          [`${newPost}>properties>status>enum`, ["draft"]],
          [`${newPost}>properties>text`, undefined]
        )
      )
    ).toEqual([
      "posts.list: query parameter from is no longer taken",
      "posts.list: query parameter limit was optional, and is now required",
      "posts.list: query parameter zone is new, and required",
      'NewPost.status no longer takes the value "scheduled"',
      "NewPost.status was optional, and is now required",
      "NewPost.text is no longer taken",
      "NewPost.channel is new, and required",
    ]);
  });

  it("refuses answering clients less than they read today", () => {
    expect(
      breaking(
        changed(
          [`${post}>properties>text`, undefined],
          [`${post}>required`, ["id"]],
          [`${post}>properties>id`, { type: "integer" }],
          [`${create}>responses>201`, undefined],
          // An error that is no longer answered breaks nobody.
          [`${list}>responses>404`, undefined]
        )
      )
    ).toEqual([
      "posts.create: 201 answer is no longer answered",
      "Post.id was string, and is integer",
      "Post.status was always answered, and may now be missing",
      "Post.text is no longer answered",
    ]);
  });

  it("refuses a schema that goes, whose type the SDKs export", () => {
    expect(
      breaking(
        changed(
          ["components>schemas>Article", { type: "object" }],
          [post, undefined],
          [
            `${create}>responses>201>content>application/json>schema`,
            reference("Article"),
          ]
        )
      )
    ).toContain(
      "Post is no longer a schema of the API: the SDKs' type of that name goes"
    );
  });

  it("lets an error be answered with others beside it, not a success", () => {
    const after = changed(either(`${list}>responses>404`));

    expect(breaking(after)).toEqual([]);
    expect(others(after)).toEqual([
      "addition: posts.list: 404 answer may answer NewPost",
    ]);

    expect(breaking(changed(either(`${create}>responses>201`)))).toEqual([
      "posts.create: 201 answer was a Post, and is a union",
    ]);
  });

  it("tells a deprecation apart: announced, and nothing breaks yet", () => {
    const after = changed([`${list}>deprecated`, true]);

    expect(breaking(after)).toEqual([]);
    expect(others(after)).toEqual(["deprecation: posts.list is deprecated"]);
  });

  it("follows the members of a union, by tag", () => {
    const changes = apiChanges(
      withState(
        tagged("active"),
        tagged("disabled", { since: { type: "string" } })
      ),
      withState(tagged("active"), tagged("disabled"), tagged("paused"))
    ).map(({ kind, what, where }) => `${kind}: ${where} ${what}`);

    expect(changes).toEqual([
      "addition: Post.state may answer paused",
      "breaking: Post.state (disabled).since is no longer answered",
    ]);
  });
});

describe("what a client sends may not be narrowed, nor what it is promised taken away", () => {
  it("refuses a tighter limit on what is sent, and lets a looser one through", () => {
    const limited = (limits: JsonObject): Edit => [
      `${newPost}>properties>text`,
      { maxLength: 500, minLength: 1, type: "string", ...limits },
    ];

    const before = changed(limited({}));

    const lines = (after: JsonObject) =>
      apiChanges(before, after)
        .filter(({ kind }) => kind === "breaking")
        .map(lineOf);

    expect(lines(changed(limited({ maxLength: 280 })))).toEqual([
      "NewPost.text takes at most 280 (maxLength), where it took 500",
    ]);
    expect(lines(changed(limited({ minLength: 2 })))).toEqual([
      "NewPost.text takes at least 2 (minLength), where it took 1",
    ]);
    expect(lines(changed(limited({ pattern: "^\\S" })))).toEqual([
      "NewPost.text must now match a pattern, ^\\S",
    ]);
    expect(lines(changed(limited({ maxLength: 1000, minLength: 0 })))).toEqual(
      []
    );
    // A limit where there was none.
    expect(
      breaking(changed([`${newPost}>properties>text>maxLength`, 100]))
    ).toEqual([
      "NewPost.text takes at most 100 (maxLength), where it took any",
    ]);
    // On a parameter and an array too.
    expect(
      breaking(
        changed([
          `${list}>parameters>1>schema`,
          { maximum: 50, type: "integer" },
        ])
      )
    ).toEqual([
      "posts.list: query parameter limit takes at most 50 (maximum), where it took any",
    ]);
  });

  it("refuses a body that becomes required, and a way of signing in that goes", () => {
    const optional = changed([`${create}>requestBody>required`, false]);

    expect(
      apiChanges(optional, released())
        .filter(({ kind }) => kind === "breaking")
        .map(lineOf)
    ).toEqual(["posts.create: body was optional, and is now required"]);

    const signed = changed([
      `${list}>security`,
      [{ bearer: [] }, { cookie: [] }],
    ]);

    expect(
      apiChanges(signed, changed([`${list}>security`, [{ cookie: [] }]]))
        .filter(({ kind }) => kind === "breaking")
        .map(lineOf)
    ).toEqual(["posts.list no longer takes the credential bearer"]);
    // Open before, and now asking for a credential.
    expect(breaking(changed([`${list}>security`, [{ bearer: [] }]]))).toEqual([
      "posts.list now needs a credential, where it took none",
    ]);
  });

  it("refuses a value or a member no longer answered, and null where there was always a value", () => {
    expect(
      breaking(changed([`${post}>properties>status>enum`, ["draft"]]))
    ).toEqual(['Post.status no longer answers the value "scheduled"']);

    const before = withState(tagged("idle"), tagged("busy"));

    const lines = (after: JsonObject) =>
      apiChanges(before, after)
        .filter(({ kind }) => kind === "breaking")
        .map(lineOf);

    expect(lines(withState(tagged("idle")))).toEqual([
      "Post.state no longer answers busy",
    ]);
    expect(
      lines(withState(tagged("idle"), tagged("busy"), { type: "null" }))
    ).toEqual(["Post.state may now answer null"]);
  });

  it("refuses a tag a discriminator no longer maps, and an error that moves to another status", () => {
    const mapped = (mapping: JsonObject) =>
      changed([
        `${post}>properties>state`,
        {
          discriminator: { mapping, propertyName: "type" },
          oneOf: [reference("Post"), reference("NewPost")],
        },
      ]);

    const both = {
      made: "#/components/schemas/Post",
      new: "#/components/schemas/NewPost",
    };

    expect(
      apiChanges(mapped(both), mapped({ made: both.made }))
        .filter(({ kind }) => kind === "breaking")
        .map(lineOf)
    ).toEqual(["Post.state no longer maps the tag new"]);

    const moved = changed(
      [`${list}>responses>404`, undefined],
      [
        `${list}>responses>410`,
        { content: { "application/json": { schema: reference("Post") } } },
      ]
    );

    expect(breaking(moved)).toEqual([
      "posts.list: 404 answer Post is now answered with the status 410",
    ]);
  });

  it("finds a document that lists no operation at all", () => {
    expect(operationCount({})).toBe(0);
    expect(operationCount(released())).toBe(2);
  });
});
