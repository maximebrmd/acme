import { Option, Result } from "effect";
import sax from "sax";

/** An attribute's value, in its namespace. */
export interface Attribute {
  readonly uri: string;
  readonly value: string;
}

/**
 * An element of an XML document, as feeds are read: its name in its
 * namespace (`uri`, empty for none), its attributes by local name with
 * theirs, its text (every piece of text and CDATA directly in it, in
 * order), all the text in it and its descendants, in order, and its
 * child elements.
 */
export interface XmlElement {
  readonly allText: string;
  readonly attributes: ReadonlyMap<string, Attribute>;
  readonly children: readonly XmlElement[];
  readonly name: string;
  readonly text: string;
  readonly uri: string;
}

/** The most elements open inside one another in a document Peal reads. */
export const maxXmlDepth = 64;

/** The most elements a document Peal reads holds. */
export const maxXmlElements = 100_000;

const refuse = (reason: string) => {
  throw new Error(reason);
};

interface Building {
  allText: string;
  readonly attributes: Map<string, Attribute>;
  readonly children: XmlElement[];
  readonly name: string;
  text: string;
  readonly uri: string;
}

/**
 * The document's root element, or none when it is not well-formed XML,
 * or is deeper or larger than Peal reads.
 *
 * Parsed by sax in strict mode, with namespaces. sax reads a DOCTYPE and
 * does nothing with it: no entity it declares is ever expanded, and no
 * external entity or DTD is ever fetched; a reference to an entity it
 * does not know (any but XML's five, HTML's named characters and
 * numeric references) fails the parse. It reads without recursion, and
 * the depth and element bounds below stop a document built to exhaust
 * memory.
 */
export const parseXml = (text: string): Option.Option<XmlElement> => {
  const parser = sax.createStream(true, {
    position: false,
    trim: false,
    xmlns: true,
  });

  const open: Building[] = [];
  let root: XmlElement | undefined;
  let elements = 0;

  const appendText = (piece: string) => {
    const current = open.at(-1);

    if (current !== undefined) {
      current.text += piece;
      current.allText += piece;
    }
  };

  parser.on("error", (error) => {
    throw error;
  });

  parser.on("opentag", (tag) => {
    elements += 1;

    if (elements > maxXmlElements || open.length >= maxXmlDepth) {
      refuse("The document is too large or too deep");
    }

    if (!("uri" in tag)) {
      refuse("The parser gave no namespaces");

      return;
    }

    const attributes = new Map<string, Attribute>();

    for (const attribute of Object.values(tag.attributes)) {
      attributes.set(attribute.local, {
        uri: attribute.uri,
        value: attribute.value,
      });
    }

    open.push({
      allText: "",
      attributes,
      children: [],
      name: tag.local,
      text: "",
      uri: tag.uri,
    });
  });

  parser.on("closetag", () => {
    const closed = open.pop();

    if (closed === undefined) {
      return;
    }

    const parent = open.at(-1);

    if (parent === undefined) {
      root = closed;
    } else {
      parent.children.push(closed);
      parent.allText += closed.allText;
    }
  });

  parser.on("text", appendText);
  parser.on("cdata", appendText);

  const parsed = Result.try(() => {
    parser.write(text.replace(/^\uFEFF/u, ""));
    parser.end();
  });

  return Result.isSuccess(parsed)
    ? Option.fromUndefinedOr(root)
    : Option.none();
};

/** The element's children named `name` in the namespace `uri`. */
export const childrenNamed = (
  element: XmlElement,
  name: string,
  uri = ""
): readonly XmlElement[] =>
  element.children.filter((child) => child.name === name && child.uri === uri);

/** The element's first child named `name` in the namespace `uri`. */
export const childNamed = (
  element: XmlElement,
  name: string,
  uri = ""
): Option.Option<XmlElement> =>
  Option.fromUndefinedOr(childrenNamed(element, name, uri)[0]);

/** The value of the element's attribute `name`, of no namespace. */
export const attributeOf = (
  element: XmlElement,
  name: string
): Option.Option<string> =>
  Option.fromUndefinedOr(element.attributes.get(name)).pipe(
    Option.filter(({ uri }) => uri === ""),
    Option.map(({ value }) => value)
  );
