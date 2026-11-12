import { Cause, Exit, Option, Schema } from "effect";
import { Forbidden, ImportUnreadable } from "peal-contract";
import type {
  ImportProblem,
  ImportResult,
  ImportRowResult,
} from "peal-contract";

import type { ImportFile, ImportFileRefusal } from "./import-file.ts";

// The CSV import screen, step by step: a file is chosen, the server checks
// it (`dryRun`), and only a file whose every row passed is imported, once,
// under the idempotency key made when its check passed. The browser never
// reads the CSV itself: every row's fate comes from the server.

/** The server is checking the file. */
export interface CheckingImport {
  readonly _tag: "checking";
  readonly csv: string;
}

/** The server is making the posts of a checked file. */
export interface RunningImport {
  readonly _tag: "importing";
  readonly csv: string;
  readonly key: string;
  // Whether this import is sent again after a failure: the attempt whose
  // answer was lost may have made posts.
  readonly retried: boolean;
  readonly rows: readonly ImportRowResult[];
}

/** Why a request failed whole: the role changed, or anything else. */
export type ImportFailure = "forbidden" | "unknown";

export type ImportState =
  | { readonly _tag: "idle" }
  | { readonly _tag: "fileRefused"; readonly reason: ImportFileRefusal }
  | CheckingImport
  // The server cannot read the file as posts at all.
  | {
      readonly _tag: "unreadable";
      readonly column: string | null;
      readonly problem: ImportProblem;
    }
  // The file's rows as the check answered them. `key` is made when every
  // row passed, and kept for this file: a retry sends it again, and a new
  // check makes another.
  | {
      readonly _tag: "checked";
      readonly csv: string;
      readonly key: string | null;
      readonly rows: readonly ImportRowResult[];
    }
  | RunningImport
  | {
      readonly _tag: "imported";
      readonly created: number;
      readonly retried: boolean;
      readonly rows: readonly ImportRowResult[];
    }
  // A request failed whole: retrying sends the same step again.
  | {
      readonly _tag: "failed";
      readonly reason: ImportFailure;
      readonly step: CheckingImport | RunningImport;
    };

export type ImportEvent =
  // A file was chosen and read in the browser, or refused there.
  | { readonly _tag: "chosen"; readonly file: ImportFile }
  // The check answered; `key` is a new idempotency key, kept only when the
  // file may be imported.
  | {
      readonly _tag: "checked";
      readonly key: string;
      readonly result: ImportResult;
    }
  | {
      readonly _tag: "unreadable";
      readonly column: string | null;
      readonly problem: ImportProblem;
    }
  | { readonly _tag: "confirmed" }
  | { readonly _tag: "imported"; readonly result: ImportResult }
  | { readonly _tag: "failed"; readonly reason: ImportFailure }
  | { readonly _tag: "retried" };

export const idleImport: ImportState = { _tag: "idle" };

const everyRowValid = (rows: readonly ImportRowResult[]): boolean =>
  rows.length > 0 && rows.every(({ _tag }) => _tag === "valid");

/** Whether Import is offered: a checked file whose every row is valid. */
export const canImport = (state: ImportState): boolean =>
  state._tag === "checked" && state.key !== null && everyRowValid(state.rows);

/** Whether a request is in flight, when nothing else may be asked. */
export const isBusy = (state: ImportState): boolean =>
  state._tag === "checking" || state._tag === "importing";

/** The rows the import refused, after the check had passed them. */
export const refusedMeanwhile = (
  rows: readonly ImportRowResult[]
): ImportRowResult[] => rows.filter(({ _tag }) => _tag === "refused");

const chose = (file: ImportFile): ImportState =>
  file._tag === "read"
    ? { _tag: "checking", csv: file.csv }
    : { _tag: "fileRefused", reason: file.reason };

/**
 * The state after an event. An event the state does not wait for leaves
 * it as it is: a second confirm while importing, an answer that comes
 * after another file was chosen, a file chosen while one is imported.
 */
export const nextImport = (
  state: ImportState,
  event: ImportEvent
): ImportState => {
  switch (event._tag) {
    case "chosen": {
      return state._tag === "importing" ? state : chose(event.file);
    }

    case "checked": {
      return state._tag === "checking"
        ? {
            _tag: "checked",
            csv: state.csv,
            key: everyRowValid(event.result.rows) ? event.key : null,
            rows: event.result.rows,
          }
        : state;
    }

    case "unreadable": {
      return isBusy(state)
        ? { _tag: "unreadable", column: event.column, problem: event.problem }
        : state;
    }

    case "confirmed": {
      return state._tag === "checked" && state.key !== null && canImport(state)
        ? {
            _tag: "importing",
            csv: state.csv,
            key: state.key,
            retried: false,
            rows: state.rows,
          }
        : state;
    }

    case "imported": {
      return state._tag === "importing"
        ? {
            _tag: "imported",
            created: event.result.created,
            retried: state.retried,
            rows: event.result.rows,
          }
        : state;
    }

    case "failed": {
      return state._tag === "checking" || state._tag === "importing"
        ? { _tag: "failed", reason: event.reason, step: state }
        : state;
    }

    case "retried": {
      if (state._tag !== "failed") {
        return state;
      }

      return state.step._tag === "importing"
        ? { ...state.step, retried: true }
        : state.step;
    }

    default: {
      return event satisfies never;
    }
  }
};

const isUnreadable = Schema.is(ImportUnreadable);
const isForbidden = Schema.is(Forbidden);

/**
 * The event a request's end makes: its answer, a file the server cannot
 * read, or a failure, `forbidden` when the role changed meanwhile.
 * `newKey` makes the key a passed check keeps.
 */
export const answerOf = <E>(
  exit: Exit.Exit<ImportResult, E>,
  step: "check" | "import",
  newKey: () => string
): ImportEvent => {
  if (Exit.isSuccess(exit)) {
    return step === "check"
      ? { _tag: "checked", key: newKey(), result: exit.value }
      : { _tag: "imported", result: exit.value };
  }

  return Cause.findErrorOption(exit.cause).pipe(
    Option.map((error): ImportEvent => {
      if (isUnreadable(error)) {
        return {
          _tag: "unreadable",
          column: error.column,
          problem: error.problem,
        };
      }

      return {
        _tag: "failed",
        reason: isForbidden(error) ? "forbidden" : "unknown",
      };
    }),
    Option.getOrElse((): ImportEvent => ({ _tag: "failed", reason: "unknown" }))
  );
};

/**
 * Sends one step and makes its event, whatever happens: the key is made
 * before the request (a check's new one, or an import's own), and a throw,
 * from making the key or from the request, ends the step `failed` rather
 * than leaving the screen busy.
 */
export const settle = async <E>(
  step: "check" | "import",
  key: () => string,
  request: (key: string) => Promise<Exit.Exit<ImportResult, E>>
): Promise<ImportEvent> => {
  try {
    const made = key();

    return answerOf(await request(made), step, () => made);
  } catch {
    return { _tag: "failed", reason: "unknown" };
  }
};
