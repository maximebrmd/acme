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

interface ReportQuery {
  cursor?: string;
  days: 7 | 30 | 90;
  timeZone: string;
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

/** Which page of the report across workspaces to read. */
export interface ReportPageRequest {
  readonly cursor: Option.Option<string>;
  readonly days: "7" | "30" | "90";
  readonly timeZone: string;
}

const days = { "30": 30, "7": 7, "90": 90 } as const;

// A page is keyed by its days, zone and cursor; a zone holds no "|".
const reports = Atom.family((key: string) => {
  const [range = "30", timeZone = "UTC", cursor = ""] = key.split("|");

  const query: ReportQuery = {
    days: range === "7" || range === "90" ? days[range] : days["30"],
    timeZone,
  };

  if (cursor !== "") {
    query.cursor = cursor;
  }

  return PealApi.query("overview", "report", { query });
});

/** A page of the report across the person's workspaces. */
export const reportPage = ({
  cursor,
  days: range,
  timeZone,
}: ReportPageRequest) =>
  reports([range, timeZone, Option.getOrElse(cursor, () => "")].join("|"));
