import { DateTime, Option } from "effect";
import { Atom } from "effect/reactivity";

import { PealApi } from "#api/client.ts";

/** Which page of the agenda to read. */
export interface AgendaPageRequest {
  readonly cursor: Option.Option<string>;
  readonly from: DateTime.Utc;
  readonly to: DateTime.Utc;
  /** One workspace, or every one where the person may read posts. */
  readonly workspaceId: Option.Option<string>;
}

interface AgendaQuery {
  cursor?: string;
  from: DateTime.Utc;
  to: DateTime.Utc;
  workspaceIds?: string;
}

// A page is keyed by its request written as one string: instants in ISO
// 8601, ids and cursors, none of which holds a "|".
const keyOf = ({ cursor, from, to, workspaceId }: AgendaPageRequest) =>
  [
    DateTime.formatIso(from),
    DateTime.formatIso(to),
    Option.getOrElse(workspaceId, () => ""),
    Option.getOrElse(cursor, () => ""),
  ].join("|");

const pages = Atom.family((key: string) => {
  const [from = "", to = "", workspaceId = "", cursor = ""] = key.split("|");

  const query: AgendaQuery = {
    from: DateTime.makeUnsafe(from),
    to: DateTime.makeUnsafe(to),
  };

  if (cursor !== "") {
    query.cursor = cursor;
  }

  if (workspaceId !== "") {
    query.workspaceIds = workspaceId;
  }

  return PealApi.query("overview", "agenda", { query });
});

/** A page of the agenda across the person's workspaces. */
export const agendaPage = (request: AgendaPageRequest) => pages(keyOf(request));
