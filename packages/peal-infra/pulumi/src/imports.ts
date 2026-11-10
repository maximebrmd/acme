import { readFileSync } from "node:fs";

import * as pulumi from "@pulumi/pulumi";
import { Schema } from "effect";

const ImportIdsSchema = Schema.Record(Schema.String, Schema.NonEmptyString);

/**
 * Adopts resources made by hand rather than making them again: with
 * PEAL_PULUMI_IMPORT naming a JSON file of `{ "<resource name>": "<id>" }`
 * (the ids each resource's `pulumi import` documents), every resource
 * named there is imported at its id. Run `preview`, then `up`, with it once,
 * then without it: the ids then live in the state. Never commit the file.
 */
export const importExisting = (): void => {
  const path = process.env["PEAL_PULUMI_IMPORT"];

  if (path === undefined || path === "") {
    return;
  }

  const ids = Schema.decodeUnknownSync(ImportIdsSchema)(
    JSON.parse(readFileSync(path, "utf-8"))
  );

  pulumi.runtime.registerResourceTransform((args) => {
    const id = ids[args.name];

    return id === undefined
      ? undefined
      : { opts: { ...args.opts, import: id }, props: args.props };
  });
};
