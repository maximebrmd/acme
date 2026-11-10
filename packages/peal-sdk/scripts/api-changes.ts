// What changed between two OpenAPI documents of the API, and whether a
// client written against the first still works against the second. The
// versioning policy (the docs' "API conventions") allows additions only:
// `compat.ts` runs this against the last released document, and fails on
// anything else.
//
// A client is expected to ignore fields, enum values and errors it does not
// know, so those may be added to what the server answers. What a client
// sends is held to the opposite rule: nothing it may send today may be
// refused tomorrow.
import { Schema } from "effect";

type Json = Schema.Json;

type JsonObject = Schema.JsonObject;

/** One difference between two documents. */
export interface ApiChange {
  /**
   * `breaking`: a client of the first document may fail against the second.
   * `deprecation`: an operation announced as going away. `addition`:
   * something a client may start using.
   */
  readonly kind: "addition" | "breaking" | "deprecation";
  /** What changed, in words. */
  readonly what: string;
  /** Where: an operation (`posts.list`), then the place in it. */
  readonly where: string;
}

const isJsonObject = Schema.is(Schema.JsonObject);
const isJsonArray = Schema.is(Schema.Array(Schema.Json));
const isString = Schema.is(Schema.String);
const isStringArray = Schema.is(Schema.Array(Schema.String));

const methods = ["get", "put", "post", "delete", "patch", "head", "options"];

const schemaPrefix = "#/components/schemas/";

const objectAt = (parent: Json | undefined, key: string): JsonObject => {
  const value = isJsonObject(parent) ? parent[key] : undefined;

  return isJsonObject(value) ? value : {};
};

const stringsAt = (parent: JsonObject, key: string): readonly string[] => {
  const value = parent[key];

  return isStringArray(value) ? value : [];
};

// A value as it is written in a sentence: a string as it is, anything else
// as JSON.
const written = (value: Json | undefined): string =>
  isString(value) ? value : JSON.stringify(value ?? null);

/** Which way a schema travels: what clients send, or what they are sent. */
type Direction = "request" | "response";

// Compares two schemas that travel one way, at a place.
type Compare = (
  before: Json | undefined,
  after: Json | undefined,
  direction: Direction,
  where: string
) => readonly ApiChange[];

const change = (
  kind: ApiChange["kind"],
  where: string,
  what: string
): ApiChange => ({ kind, what, where });

// The schema a reference names, if the value is one.
const referenced = (schema: JsonObject): string | undefined => {
  const target: string = written(schema["$ref"]);

  return target.startsWith(schemaPrefix)
    ? target.slice(schemaPrefix.length)
    : undefined;
};

const unionOf = (schema: JsonObject): readonly Json[] | undefined => {
  const members = schema["anyOf"] ?? schema["oneOf"];

  return isJsonArray(members) ? members : undefined;
};

// A member of a union, named by what tells it apart: the schema it refers
// to, its tag, its constant or its type.
const memberName = (member: Json): string => {
  if (!isJsonObject(member)) {
    return written(member);
  }

  const [tag] = stringsAt(
    objectAt(objectAt(member, "properties"), "_tag"),
    "enum"
  );

  return (
    referenced(member) ??
    tag ??
    ("const" in member ? written(member["const"]) : written(member["type"]))
  );
};

// What a schema is at its surface: a reference, a union, a constant, or a
// type with its format.
const kindOf = (schema: JsonObject): string => {
  const name = referenced(schema);

  if (name !== undefined) {
    return `a ${name}`;
  }

  if (unionOf(schema) !== undefined) {
    return "a union";
  }

  if ("const" in schema) {
    return `the constant ${JSON.stringify(schema["const"])}`;
  }

  const type =
    schema["type"] === undefined ? "any value" : written(schema["type"]);

  const { format } = schema;

  return isString(format) ? `${type} (${format})` : type;
};

const enumOf = (schema: JsonObject): readonly string[] | undefined => {
  const values = schema["enum"];

  return isJsonArray(values)
    ? values.map((value) => JSON.stringify(value))
    : undefined;
};

// What is listed now and was not before.
const gained = (before: readonly string[], after: readonly string[]) =>
  after.filter((name) => !before.includes(name));

// The values of an enum, or the members of a union, that came and went: a
// value the server no longer sends breaks no client; one it no longer takes
// does.
const listChanges = (
  before: readonly string[],
  after: readonly string[],
  sent: boolean,
  where: string,
  noun: string
): readonly ApiChange[] => [
  ...gained(after, before).map((name) =>
    change(
      sent ? "breaking" : "addition",
      where,
      `no longer ${sent ? "takes" : "answers"} ${noun}${name}`
    )
  ),
  ...gained(before, after).map((name) =>
    change("addition", where, `${sent ? "takes" : "may answer"} ${noun}${name}`)
  ),
];

const enumChanges = (
  before: JsonObject,
  after: JsonObject,
  sent: boolean,
  where: string
): readonly ApiChange[] => {
  const valuesBefore = enumOf(before);
  const valuesAfter = enumOf(after);

  if (valuesAfter === undefined) {
    return [];
  }

  if (valuesBefore === undefined) {
    return sent
      ? [change("breaking", where, "takes only some values, where it took any")]
      : [];
  }

  return listChanges(valuesBefore, valuesAfter, sent, where, "the value ");
};

// Whether a property that stays is still asked for, or answered, as before.
const presenceChanges = (
  wasRequired: boolean,
  isRequired: boolean,
  sent: boolean,
  place: string
): readonly ApiChange[] => {
  if (!sent && wasRequired && !isRequired) {
    return [
      change("breaking", place, "was always answered, and may now be missing"),
    ];
  }

  return sent && !wasRequired && isRequired
    ? [change("breaking", place, "was optional, and is now required")]
    : [];
};

const propertyChanges = (
  compare: Compare,
  before: JsonObject,
  after: JsonObject,
  direction: Direction,
  where: string
): readonly ApiChange[] => {
  const sent = direction === "request";
  const propertiesBefore = objectAt(before, "properties");
  const propertiesAfter = objectAt(after, "properties");
  const requiredBefore = stringsAt(before, "required");
  const requiredAfter = stringsAt(after, "required");

  const kept = Object.entries(propertiesBefore).flatMap(([name, property]) => {
    const place = `${where}.${name}`;

    return name in propertiesAfter
      ? [
          ...compare(property, propertiesAfter[name], direction, place),
          ...presenceChanges(
            requiredBefore.includes(name),
            requiredAfter.includes(name),
            sent,
            place
          ),
        ]
      : [
          change(
            "breaking",
            place,
            sent ? "is no longer taken" : "is no longer answered"
          ),
        ];
  });

  const added = gained(
    Object.keys(propertiesBefore),
    Object.keys(propertiesAfter)
  ).map((name) => {
    const required = requiredAfter.includes(name);

    return change(
      sent && required ? "breaking" : "addition",
      `${where}.${name}`,
      sent
        ? `is new, and ${required ? "required" : "optional"}`
        : "is new in the answer"
    );
  });

  return [...kept, ...added];
};

const unionChanges = (
  compare: Compare,
  before: JsonObject,
  after: JsonObject,
  direction: Direction,
  where: string
): readonly ApiChange[] => {
  const membersBefore = unionOf(before);
  const membersAfter = unionOf(after);

  if (membersBefore === undefined || membersAfter === undefined) {
    return [];
  }

  return [
    ...listChanges(
      membersBefore.map(memberName),
      membersAfter.map(memberName),
      direction === "request",
      where,
      ""
    ),
    ...membersBefore.flatMap((member) =>
      compare(
        member,
        membersAfter.find(
          (candidate) => memberName(candidate) === memberName(member)
        ),
        direction,
        `${where} (${memberName(member)})`
      )
    ),
  ];
};

/**
 * The differences between two schemas that travel in `direction`. Schemas
 * a reference names are compared once, by name (`changedSchemas`): here a
 * reference only has to stay the same reference.
 */
export const schemaChanges: Compare = (before, after, direction, where) => {
  if (!isJsonObject(before) || !isJsonObject(after)) {
    return [];
  }

  if (kindOf(before) !== kindOf(after)) {
    return [
      change(
        "breaking",
        where,
        `was ${kindOf(before)}, and is ${kindOf(after)}`
      ),
    ];
  }

  return [
    ...enumChanges(before, after, direction === "request", where),
    ...unionChanges(schemaChanges, before, after, direction, where),
    ...schemaChanges(before["items"], after["items"], direction, `${where}[]`),
    ...schemaChanges(
      before["additionalProperties"],
      after["additionalProperties"],
      direction,
      `${where}.*`
    ),
    ...propertyChanges(schemaChanges, before, after, direction, where),
  ];
};

interface Operation {
  readonly id: string;
  readonly operation: JsonObject;
}

// A document's operations, by method and path.
const operationsOf = (document: JsonObject): ReadonlyMap<string, Operation> =>
  new Map(
    Object.entries(objectAt(document, "paths")).flatMap(([path, item]) =>
      methods.flatMap((method) => {
        const operation = isJsonObject(item) ? item[method] : undefined;
        const route = `${method.toUpperCase()} ${path}`;

        return isJsonObject(operation)
          ? [
              [
                route,
                {
                  id: isString(operation["operationId"])
                    ? operation["operationId"]
                    : route,
                  operation,
                },
              ] as const,
            ]
          : [];
      })
    )
  );

const parametersOf = (
  operation: JsonObject
): ReadonlyMap<string, JsonObject> => {
  const { parameters } = operation;

  return new Map(
    (isJsonArray(parameters) ? parameters : []).flatMap((parameter) =>
      isJsonObject(parameter)
        ? [
            [
              `${written(parameter["in"])} parameter ${written(parameter["name"])}`,
              parameter,
            ] as const,
          ]
        : []
    )
  );
};

// The schemas of a body or an answer, by media type.
const contentOf = (holder: Json | undefined): ReadonlyMap<string, Json> =>
  new Map(
    Object.entries(objectAt(holder, "content")).flatMap(([type, media]) =>
      isJsonObject(media) && media["schema"] !== undefined
        ? [[type, media["schema"]] as const]
        : []
    )
  );

const parameterChanges = (
  before: JsonObject,
  after: JsonObject,
  id: string
): readonly ApiChange[] => {
  const parametersBefore = parametersOf(before);
  const parametersAfter = parametersOf(after);

  return [
    ...[...parametersBefore].flatMap(([name, parameter]) => {
      const same = parametersAfter.get(name);
      const place = `${id}: ${name}`;

      return same === undefined
        ? [change("breaking", place, "is no longer taken")]
        : [
            ...schemaChanges(
              parameter["schema"],
              same["schema"],
              "request",
              place
            ),
            ...presenceChanges(
              parameter["required"] === true,
              same["required"] === true,
              true,
              place
            ),
          ];
    }),
    ...[...parametersAfter].flatMap(([name, parameter]) => {
      const required = parameter["required"] === true;

      return parametersBefore.has(name)
        ? []
        : [
            change(
              required ? "breaking" : "addition",
              `${id}: ${name}`,
              `is new, and ${required ? "required" : "optional"}`
            ),
          ];
    }),
  ];
};

const bodyChanges = (
  before: JsonObject,
  after: JsonObject,
  id: string
): readonly ApiChange[] => {
  const bodyBefore = contentOf(before["requestBody"]);
  const bodyAfter = contentOf(after["requestBody"]);
  const place = `${id}: body`;
  const required = objectAt(after, "requestBody")["required"] === true;

  return [
    ...[...bodyBefore].flatMap(([type, schema]) =>
      bodyAfter.has(type)
        ? schemaChanges(schema, bodyAfter.get(type), "request", place)
        : [change("breaking", place, `is no longer taken as ${type}`)]
    ),
    ...(bodyBefore.size === 0 && bodyAfter.size > 0
      ? [
          change(
            required ? "breaking" : "addition",
            place,
            `is new, and ${required ? "required" : "optional"}`
          ),
        ]
      : []),
  ];
};

// The differences between an answer's schemas. An error answered with one
// schema may come to be answered with that one or others: clients are told
// to expect errors they do not know.
const answerChanges = (
  before: Json,
  after: Json | undefined,
  status: string,
  place: string
): readonly ApiChange[] => {
  const members =
    isJsonObject(after) && isJsonObject(before) && unionOf(before) === undefined
      ? unionOf(after)
      : undefined;

  const same = members?.find(
    (member) => memberName(member) === memberName(before)
  );

  return Number(status) >= 400 && members !== undefined && same !== undefined
    ? [
        ...members
          .filter((member) => member !== same)
          .map((member) =>
            change("addition", place, `may answer ${memberName(member)}`)
          ),
        ...schemaChanges(before, same, "response", place),
      ]
    : schemaChanges(before, after, "response", place);
};

const answersChanges = (
  before: JsonObject,
  after: JsonObject,
  id: string
): readonly ApiChange[] => {
  const answersBefore = objectAt(before, "responses");
  const answersAfter = objectAt(after, "responses");

  return [
    ...Object.entries(answersBefore).flatMap(([status, answer]) => {
      const place = `${id}: ${status} answer`;

      if (!(status in answersAfter)) {
        // An error the server no longer answers breaks no client.
        return Number(status) < 400
          ? [change("breaking", place, "is no longer answered")]
          : [];
      }

      const contentAfter = contentOf(answersAfter[status]);

      return [...contentOf(answer)].flatMap(([type, schema]) =>
        contentAfter.has(type)
          ? answerChanges(schema, contentAfter.get(type), status, place)
          : [change("breaking", place, `is no longer answered as ${type}`)]
      );
    }),
    ...gained(Object.keys(answersBefore), Object.keys(answersAfter)).map(
      (status) => change("addition", `${id}: ${status} answer`, "is new")
    ),
  ];
};

const operationChanges = (
  before: JsonObject,
  after: JsonObject,
  id: string
): readonly ApiChange[] => [
  ...(before["operationId"] === after["operationId"]
    ? []
    : [
        change(
          "breaking",
          id,
          `is now called ${written(after["operationId"])}: the SDKs' method changes name`
        ),
      ]),
  ...(before["deprecated"] !== true && after["deprecated"] === true
    ? [change("deprecation", id, "is deprecated")]
    : []),
  ...parameterChanges(before, after, id),
  ...bodyChanges(before, after, id),
  ...answersChanges(before, after, id),
];

// The names of the schemas a value refers to, and those they refer to.
const referencesIn = (
  value: Json | undefined,
  schemas: JsonObject,
  found: Set<string>
): void => {
  if (isJsonArray(value)) {
    for (const item of value) {
      referencesIn(item, schemas, found);
    }

    return;
  }

  if (!isJsonObject(value)) {
    return;
  }

  const name = referenced(value);

  if (name !== undefined && !found.has(name)) {
    found.add(name);
    referencesIn(schemas[name], schemas, found);
  }

  for (const child of Object.values(value)) {
    referencesIn(child, schemas, found);
  }
};

const schemasOf = (document: JsonObject): JsonObject =>
  objectAt(objectAt(document, "components"), "schemas");

// The schemas a document's operations send, and those they are answered.
const directionsOf = (document: JsonObject) => {
  const schemas = schemasOf(document);
  const sent = new Set<string>();
  const answered = new Set<string>();

  for (const { operation } of operationsOf(document).values()) {
    referencesIn(operation["parameters"], schemas, sent);
    referencesIn(operation["requestBody"], schemas, sent);
    referencesIn(operation["responses"], schemas, answered);
  }

  return { answered, sent };
};

const changedSchemas = (
  before: JsonObject,
  after: JsonObject
): readonly ApiChange[] => {
  const schemasBefore = schemasOf(before);
  const schemasAfter = schemasOf(after);
  const directions = directionsOf(before);

  return [
    ...Object.entries(schemasBefore).flatMap(([name, schema]) =>
      name in schemasAfter
        ? [
            ...(directions.sent.has(name)
              ? schemaChanges(schema, schemasAfter[name], "request", name)
              : []),
            ...(directions.answered.has(name)
              ? schemaChanges(schema, schemasAfter[name], "response", name)
              : []),
          ]
        : [
            change(
              "breaking",
              name,
              "is no longer a schema of the API: the SDKs' type of that name goes"
            ),
          ]
    ),
    ...gained(Object.keys(schemasBefore), Object.keys(schemasAfter)).map(
      (name) => change("addition", name, "is a new schema")
    ),
  ];
};

/**
 * Every difference between two documents of the API, the first being the
 * one clients were written against: operations, their parameters, bodies
 * and answers, then the named schemas. A change that shows in both
 * directions of a schema is listed once.
 */
export const apiChanges = (
  before: JsonObject,
  after: JsonObject
): readonly ApiChange[] => {
  const operationsBefore = operationsOf(before);
  const operationsAfter = operationsOf(after);

  const changes = [
    ...[...operationsBefore].flatMap(([route, { id, operation }]) => {
      const same = operationsAfter.get(route);

      return same === undefined
        ? [change("breaking", id, `is gone (${route})`)]
        : operationChanges(operation, same.operation, id);
    }),
    ...[...operationsAfter].flatMap(([route, { id }]) =>
      operationsBefore.has(route)
        ? []
        : [change("addition", id, `is a new operation (${route})`)]
    ),
    ...changedSchemas(before, after),
  ];

  const seen = new Set<string>();

  return changes.filter(({ kind, what, where }) => {
    const key = `${kind}|${where}|${what}`;
    const first = !seen.has(key);

    seen.add(key);

    return first;
  });
};

/** A change on one line, as the check prints it and exceptions name it. */
export const lineOf = ({ what, where }: ApiChange): string =>
  `${where} ${what}`;
