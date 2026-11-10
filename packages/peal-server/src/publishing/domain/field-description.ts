import { Predicate } from "effect";
import type { Schema, SchemaAST } from "effect";

/**
 * What a field holds: a yes or no, a text, one of a few values (`choice`),
 * several texts (`textList`, as a video's tags) or a whole number.
 */
export type FieldType = "boolean" | "choice" | "integer" | "text" | "textList";

/**
 * What a field's schema cannot say, declared beside it with the constants
 * its rules use, so no figure is written twice.
 */
export interface FieldNotes<Lookup extends string = string> {
  /** The characters the field refuses anywhere in a text. */
  readonly forbiddenCharacters?: readonly string[];
  /** What the platform does when the field is left out. */
  readonly ifLeftOut?: boolean | number | string;
  /** The lookup that answers the values the field takes on an account. */
  readonly lookup?: Lookup;
  /**
   * The longest text, in code points. For a `textList`, of all its texts
   * together, as the platform counts them.
   */
  readonly maxLength?: number;
  /** The largest whole number. */
  readonly maximum?: number;
  /** The smallest whole number. */
  readonly minimum?: number;
  /** A regular expression the whole text matches. */
  readonly pattern?: string;
}

/** A field of a platform's options, or of a lookup's input. */
export interface FieldDescription<
  Lookup extends string = string,
> extends FieldNotes<Lookup> {
  readonly name: string;
  /** Needed: to schedule the post, or to run the lookup. */
  readonly required: boolean;
  readonly type: FieldType;
  /** The values a `choice` takes; empty for any other type. */
  readonly values: readonly string[];
}

interface Kind {
  readonly type: FieldType;
  readonly values: readonly string[];
}

const ofType = (type: FieldType, values: readonly string[] = []): Kind => ({
  type,
  values,
});

const literalsOf = (union: SchemaAST.Union): readonly string[] | undefined => {
  const values = union.types.flatMap((member) =>
    member._tag === "Literal" && Predicate.isString(member.literal)
      ? [member.literal]
      : []
  );

  return values.length === union.types.length ? values : undefined;
};

// The kinds of field options and lookup inputs are made of. Anything else has no
// description yet: describing it fails, so a test says so.
const kindOf = (ast: SchemaAST.AST): Kind | undefined => {
  if (ast._tag === "Boolean") {
    return ofType("boolean");
  }

  if (ast._tag === "String") {
    return ofType("text");
  }

  if (ast._tag === "Number") {
    return ofType("integer");
  }

  if (ast._tag === "Literal" && Predicate.isString(ast.literal)) {
    return ofType("choice", [ast.literal]);
  }

  if (ast._tag === "Union") {
    const values = literalsOf(ast);

    return values === undefined ? undefined : ofType("choice", values);
  }

  if (
    ast._tag === "Arrays" &&
    ast.elements.length === 0 &&
    ast.rest.length === 1 &&
    ast.rest[0]?._tag === "String"
  ) {
    return ofType("textList");
  }

  return undefined;
};

/** A field whose schema is of a kind Peal cannot describe yet. */
export interface UndescribedField {
  readonly _tag: "undescribed";
  readonly name: string;
}

/**
 * Describes each of `fields` but `skip`, in the order of their names: its
 * type and values from its schema, and what `notes` add. A field without
 * notes, or of a kind not known here, is answered as undescribed.
 */
export const describeFields = <Lookup extends string>(
  fields: Readonly<Record<string, Schema.Top>>,
  options: {
    readonly notes: Readonly<Record<string, FieldNotes<Lookup>>>;
    readonly required: readonly string[];
    readonly skip?: readonly string[];
  }
): readonly (FieldDescription<Lookup> | UndescribedField)[] =>
  Object.entries(fields)
    .filter(([name]) => !(options.skip ?? []).includes(name))
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([name, schema]) => {
      const kind = kindOf(schema.ast);
      const notes = options.notes[name];

      if (kind === undefined || notes === undefined) {
        const undescribed: UndescribedField = { _tag: "undescribed", name };

        return undescribed;
      }

      return {
        ...notes,
        name,
        required: options.required.includes(name),
        ...kind,
      };
    });

/** Whether the field could be described. */
export const isDescribed = <Lookup extends string>(
  field: FieldDescription<Lookup> | UndescribedField
): field is FieldDescription<Lookup> => !("_tag" in field);
