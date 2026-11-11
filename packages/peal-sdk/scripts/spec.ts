// Writes openapi.json, the document every SDK is generated from: the
// contract's operations that a bearer token (a workspace API key or an OAuth
// access token) can call, plus the health checks, with only the schemas they
// reference. Session-only routes, the platforms' callbacks and the browser's
// own endpoints stay out of the SDKs, and so do the groups that answer only
// the person in their own session or Peal's command line (`ownSession`).
import path from "node:path";

import { Schema } from "effect";

import { contactEmail, homepage } from "./languages.ts";

const contractDocument = path.join(
  import.meta.dirname,
  "..",
  "..",
  "peal-contract",
  "openapi.json"
);

const sdkDocument = path.join(import.meta.dirname, "..", "openapi.json");

/** The web app's origin, which forwards /api to the server. */
const defaultServer = "https://app.peal.social";

/** Operations under this tag need no token and stay in every SDK. */
const publicTag = "system";

/**
 * Groups whose every operation refuses API keys and OAuth clients: the
 * account's export and deletion, its connected applications, deleting a
 * workspace, and ordering, cancelling or withdrawing from a plan.
 */
const ownSessionTags = new Set([
  "account",
  "billingActions",
  "connectedApps",
  "workspaces",
]);

const schemaPrefix = "#/components/schemas/";

/**
 * Effect encodes a number that JSON cannot hold as one of these strings, next
 * to the number itself. Left inline, some generators reference a type they
 * never write, so the SDKs get it as a named schema.
 */
const nonFinite: readonly string[] = ["Infinity", "-Infinity", "NaN"];
const nonFiniteName = "NonFiniteNumber";

const methods = new Set([
  "get",
  "put",
  "post",
  "delete",
  "patch",
  "head",
  "options",
]);

type Json = Schema.Json;

type JsonObject = Schema.JsonObject;

const isJsonObject = Schema.is(Schema.JsonObject);
const isJsonArray = Schema.is(Schema.Array(Schema.Json));
const isString = Schema.is(Schema.String);
const isStringArray = Schema.is(Schema.Array(Schema.String));
const isReference = Schema.is(Schema.Struct({ $ref: Schema.String }));

const SecurityRequirementsSchema = Schema.Array(
  Schema.Record(Schema.String, Schema.Array(Schema.String))
);

type SecurityRequirements = typeof SecurityRequirementsSchema.Type;

const OperationSchema = Schema.Struct({
  security: Schema.optional(SecurityRequirementsSchema),
  tags: Schema.optional(Schema.Array(Schema.String)),
});

const decodeDocument = Schema.decodeUnknownSync(
  Schema.fromJsonString(Schema.JsonObject)
);

const decodeObject = Schema.decodeUnknownSync(Schema.JsonObject);
const decodeOperation = Schema.decodeUnknownSync(OperationSchema);
const decodeSecurity = Schema.decodeUnknownSync(SecurityRequirementsSchema);

const objectAt = (parent: JsonObject, key: string): JsonObject =>
  decodeObject(parent[key] ?? {});

/** A copy of the object with these keys set, each in its place if it had one. */
const withEntries = (
  object: JsonObject,
  entries: readonly (readonly [string, Json])[]
): JsonObject => Object.fromEntries([...Object.entries(object), ...entries]);

const document = decodeDocument(await Bun.file(contractDocument).text());
const globalSecurity = decodeSecurity(document["security"] ?? []);

const allowsBearer = (security: SecurityRequirements): boolean =>
  security.some((requirement) => "bearer" in requirement);

/**
 * The operation with its SDK method: the contract's operationId is
 * `<group>.<method>` (`posts.schedule`), or the method alone for the health
 * checks, whose group is their tag.
 */
const withSdkName = (
  operation: JsonObject,
  tags: readonly string[]
): JsonObject => {
  const id = operation["operationId"];

  if (!isString(id)) {
    throw new Error(
      `An operation has no operationId: ${JSON.stringify(operation)}`
    );
  }

  const dot = id.lastIndexOf(".");
  const group = dot === -1 ? tags[0] : id.slice(0, dot);

  if (group === undefined) {
    throw new Error(`The operation ${id} has neither a group nor a tag`);
  }

  return withEntries(operation, [
    ["x-fern-sdk-group-name", group],
    ["x-fern-sdk-method-name", id.slice(dot + 1)],
  ]);
};

/** The operation as the SDKs see it, or undefined when a token cannot call it. */
const keepOperation = (operation: JsonObject): JsonObject | undefined => {
  const { security = globalSecurity, tags = [] } = decodeOperation(operation);

  if (tags.includes(publicTag)) {
    return withSdkName(operation, tags);
  }

  if (!allowsBearer(security) || tags.some((tag) => ownSessionTags.has(tag))) {
    return undefined;
  }

  return withSdkName(
    withEntries(operation, [
      ["security", security.filter((requirement) => "bearer" in requirement)],
    ]),
    tags
  );
};

/**
 * The methods HTTP calls idempotent, which the SDKs retry when the API is
 * briefly unavailable. A POST or a PATCH is never sent twice: the first may
 * have created the post or the key before its answer was lost.
 */
const repeatable = new Set(["get", "head", "options", "put", "delete"]);

/** The path's operations a token can call, or undefined when it has none. */
const keepPath = (item: JsonObject): JsonObject | undefined => {
  const kept = Object.entries(item).flatMap(
    ([key, value]): [string, Json][] => {
      if (!methods.has(key)) {
        return [[key, value]];
      }

      const operation = keepOperation(decodeObject(value));

      if (operation === undefined) {
        return [];
      }

      return [
        [
          key,
          repeatable.has(key)
            ? operation
            : withEntries(operation, [["x-fern-retries", { disabled: true }]]),
        ],
      ];
    }
  );

  return kept.some(([key]) => methods.has(key))
    ? Object.fromEntries(kept)
    : undefined;
};

const paths: JsonObject = Object.fromEntries(
  Object.entries(objectAt(document, "paths")).flatMap(
    ([route, item]): [string, Json][] => {
      const kept = keepPath(decodeObject(item));

      return kept === undefined ? [] : [[route, kept]];
    }
  )
);

const isNonFinite = (value: Json): boolean => {
  if (!isJsonObject(value)) {
    return false;
  }

  const names = value["enum"];

  return (
    isStringArray(names) &&
    names.length === nonFinite.length &&
    nonFinite.every((name) => names.includes(name))
  );
};

/**
 * Copies a node, naming the non-finite numbers. Any other enum inline in an
 * anyOf or oneOf stops the script: give it a schema of its own in the
 * contract, or a name here.
 */
const nameInlineEnums = (node: Json): Json => {
  if (isJsonArray(node)) {
    return node.map(nameInlineEnums);
  }

  if (!isJsonObject(node)) {
    return node;
  }

  const nameMember = (member: Json, key: string): Json => {
    if (isNonFinite(member)) {
      return { $ref: `${schemaPrefix}${nonFiniteName}` };
    }

    if (isJsonObject(member) && "enum" in member) {
      throw new Error(
        `An enum inline in ${key} needs a name: ${JSON.stringify(member)}`
      );
    }

    return nameInlineEnums(member);
  };

  return Object.fromEntries(
    Object.entries(node).map(([key, value]): [string, Json] => [
      key,
      (key === "anyOf" || key === "oneOf") && isJsonArray(value)
        ? value.map((member) => nameMember(member, key))
        : nameInlineEnums(value),
    ])
  );
};

const components = objectAt(document, "components");
const contractSchemas = objectAt(components, "schemas");

/** Adds the names of the schemas a node references, followed through each schema. */
const collectReferences = (node: Json, found: Set<string>): void => {
  if (isJsonArray(node)) {
    for (const child of node) {
      collectReferences(child, found);
    }

    return;
  }

  if (!isJsonObject(node)) {
    return;
  }

  if (isReference(node) && node.$ref.startsWith(schemaPrefix)) {
    const name = node.$ref.slice(schemaPrefix.length);
    const schema = contractSchemas[name];

    if (!found.has(name)) {
      found.add(name);

      if (schema !== undefined) {
        collectReferences(schema, found);
      }
    }
  }

  for (const child of Object.values(node)) {
    collectReferences(child, found);
  }
};

const referencedSchemas = (root: Json): Set<string> => {
  const found = new Set<string>();

  collectReferences(root, found);

  return found;
};

/** The property Effect writes on each member of a tagged union. */
const tagProperty = "_tag";

/** What the SDKs call it: Fern refuses a name that starts with an underscore. */
const tagName = "type";

const isOneValueEnum = Schema.is(
  Schema.Struct({ enum: Schema.Tuple([Schema.String]) })
);

const pascalCase = (text: string): string =>
  text
    .split(/[^A-Za-z0-9]+/u)
    .filter((word) => word !== "")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join("");

/** The member's tag, when it is an object whose `_tag` holds one value. */
const tagOf = (member: Json): string | undefined => {
  const schema =
    isReference(member) && member.$ref.startsWith(schemaPrefix)
      ? contractSchemas[member.$ref.slice(schemaPrefix.length)]
      : member;

  if (!isJsonObject(schema) || schema["type"] !== "object") {
    return undefined;
  }

  const { properties } = schema;
  const tag = isJsonObject(properties) ? properties[tagProperty] : undefined;

  return isOneValueEnum(tag) ? tag.enum[0] : undefined;
};

/** The members of a union whose every member is tagged, or undefined. */
const taggedMembers = (node: JsonObject): readonly Json[] | undefined => {
  const members = node["anyOf"] ?? node["oneOf"];

  return isJsonArray(members) &&
    members.length > 0 &&
    members.every((member) => tagOf(member) !== undefined)
    ? members
    : undefined;
};

/**
 * Copies a node, writing each tagged union as Fern reads one: Effect gives an
 * anyOf of objects, each with a one-value `_tag`, and Fern needs a oneOf with
 * an OpenAPI discriminator, whose mapping names one schema per tag. A member
 * written inline becomes the schema `<name><Tag>` (`ChannelStatusDisabled`),
 * added to `variants`; `name` is the schema holding the node, followed by
 * the properties down to it.
 */
const tagUnions = (
  node: Json,
  name: string | undefined,
  variants: Map<string, Json>
): Json => {
  if (isJsonArray(node)) {
    return node.map((child) => tagUnions(child, name, variants));
  }

  if (!isJsonObject(node)) {
    return node;
  }

  const copy = Object.fromEntries(
    Object.entries(node).map(([key, value]): [string, Json] => [
      key,
      key === "properties" && isJsonObject(value)
        ? Object.fromEntries(
            Object.entries(value).map(([property, schema]): [string, Json] => [
              property,
              tagUnions(
                schema,
                name === undefined
                  ? undefined
                  : `${name}${pascalCase(property)}`,
                variants
              ),
            ])
          )
        : tagUnions(value, name, variants),
    ])
  );

  const members = taggedMembers(copy);

  if (members === undefined) {
    return copy;
  }

  const mapping = members.map((member): [string, string] => {
    const tag = tagOf(member) ?? "";

    if (isReference(member)) {
      return [tag, member.$ref];
    }

    if (name === undefined) {
      throw new Error(
        `A tagged union outside the schemas writes a member inline; name it in the contract: ${JSON.stringify(member)}`
      );
    }

    const variant = `${name}${pascalCase(tag)}`;

    if (variant in contractSchemas || variants.has(variant)) {
      throw new Error(`Two schemas would be named ${variant}`);
    }

    variants.set(variant, member);

    return [tag, `${schemaPrefix}${variant}`];
  });

  return withEntries(
    Object.fromEntries(Object.entries(copy).filter(([key]) => key !== "anyOf")),
    [
      ["oneOf", mapping.map(([, reference]) => ({ $ref: reference }))],
      [
        "discriminator",
        {
          mapping: Object.fromEntries(mapping),
          propertyName: tagProperty,
          "x-fern-property-name": tagName,
        },
      ],
    ]
  );
};

const variants = new Map<string, Json>();

const sdkPaths = tagUnions(nameInlineEnums(paths), undefined, variants);

const schemaEntries = [...referencedSchemas(sdkPaths)]
  .toSorted()
  .flatMap((name): [string, Json][] => {
    const schema = contractSchemas[name];

    if (schema === undefined) {
      throw new Error(
        `The contract references a schema it does not define: ${name}`
      );
    }

    return [[name, tagUnions(nameInlineEnums(schema), name, variants)]];
  });

const namedSchemas: JsonObject = Object.fromEntries(
  // By code unit, the same on every machine.
  [...schemaEntries, ...variants.entries()].toSorted(([left], [right]) =>
    left < right ? -1 : 1
  )
);

// Naming the inline enums can only add references to this one schema.
const schemas: JsonObject = referencedSchemas({
  paths: sdkPaths,
  schemas: namedSchemas,
}).has(nonFiniteName)
  ? withEntries(namedSchemas, [
      [
        nonFiniteName,
        {
          description:
            "A number JSON cannot hold: infinity, negative infinity or not a number.",
          enum: nonFinite,
          type: "string",
        },
      ],
    ])
  : namedSchemas;

const usedTags = new Set(
  Object.values(paths)
    .filter(isJsonObject)
    .flatMap((item) =>
      Object.entries(item)
        .filter(([key]) => methods.has(key))
        .flatMap(([, operation]) => decodeOperation(operation).tags ?? [])
    )
);

const documentTags = document["tags"];

const info = withEntries(objectAt(document, "info"), [
  ["contact", { email: contactEmail, name: "Peal", url: homepage }],
  [
    "description",
    "Schedule posts across social platforms, follow how they did, and manage a Peal workspace's channels, media and members.",
  ],
  ["license", { identifier: "Apache-2.0", name: "Apache-2.0" }],
]);

// The events Peal sends to webhook endpoints stay out: the open-source
// generators make no typed events of an OpenAPI `webhooks` section, and the
// SDKs are clients of the API, not receivers (see AGENTS.md).
const leftOut = new Set(["webhooks"]);

const kept: JsonObject = Object.fromEntries(
  Object.entries(document).filter(([key]) => !leftOut.has(key))
);

const sdkDocumentContent = withEntries(kept, [
  [
    "components",
    {
      schemas,
      securitySchemes: {
        bearer: objectAt(objectAt(components, "securitySchemes"), "bearer"),
      },
    },
  ],
  ["info", info],
  ["paths", sdkPaths],
  ["servers", [{ description: "Peal", url: defaultServer }]],
  [
    "tags",
    (isJsonArray(documentTags) ? documentTags : []).filter(
      (tag) =>
        isJsonObject(tag) && isString(tag["name"]) && usedTags.has(tag["name"])
    ),
  ],
]);

await Bun.write(
  sdkDocument,
  `${JSON.stringify(sdkDocumentContent, null, 2)}\n`
);
