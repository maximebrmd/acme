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
 * account's export and deletion, its connected applications, and deleting a
 * workspace.
 */
const ownSessionTags = new Set(["account", "connectedApps", "workspaces"]);

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

/** The operation as the SDKs see it, or undefined when a token cannot call it. */
const keepOperation = (operation: JsonObject): JsonObject | undefined => {
  const { security = globalSecurity, tags = [] } = decodeOperation(operation);

  if (tags.includes(publicTag)) {
    return operation;
  }

  if (!allowsBearer(security) || tags.some((tag) => ownSessionTags.has(tag))) {
    return undefined;
  }

  return withEntries(operation, [
    ["security", security.filter((requirement) => "bearer" in requirement)],
  ]);
};

/** The path's operations a token can call, or undefined when it has none. */
const keepPath = (item: JsonObject): JsonObject | undefined => {
  const kept = Object.entries(item).flatMap(
    ([key, value]): [string, Json][] => {
      if (!methods.has(key)) {
        return [[key, value]];
      }

      const operation = keepOperation(decodeObject(value));

      return operation === undefined ? [] : [[key, operation]];
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

const sdkPaths = nameInlineEnums(paths);

const schemaEntries = [...referencedSchemas(sdkPaths)]
  .toSorted()
  .flatMap((name): [string, Json][] => {
    const schema = contractSchemas[name];

    if (schema === undefined) {
      throw new Error(
        `The contract references a schema it does not define: ${name}`
      );
    }

    return [[name, nameInlineEnums(schema)]];
  });

const namedSchemas: JsonObject = Object.fromEntries(schemaEntries);

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

const sdkDocumentContent = withEntries(document, [
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
