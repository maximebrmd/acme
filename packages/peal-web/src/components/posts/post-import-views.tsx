"use client";

import { useTranslations } from "next-intl";
import {
  importColumns,
  maxImportLength,
  maxImportRows,
  queueHorizonDays,
} from "peal-contract";
import type {
  Channel,
  ImportColumn,
  ImportRowResult,
  PostRefusal,
} from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import type { ReactNode, Ref } from "react";
import { useId, useState } from "react";

import { channelName } from "#channels/channel-name.ts";
import { useViolationText } from "#components/posts/composer-errors.tsx";
import {
  cellWords,
  importRefusalWords,
  unreadableWords,
} from "#posts/import-refusal.ts";
import type { CellWords } from "#posts/import-refusal.ts";
import { canImport, isBusy, refusedMeanwhile } from "#posts/import-state.ts";
import type { ImportState } from "#posts/import-state.ts";

// The CSV import screen's views: each state of `#posts/import-state.ts`
// drawn from props alone, links passed in, so tests render every one.

// The columns a row cannot do without, as the server reads them.
const requiredColumns: ReadonlySet<ImportColumn> = new Set([
  "text",
  "channels",
  "at",
]);

// A row's state as the catalogue names it, a row made before apart.
const stateOf = (row: ImportRowResult) =>
  row._tag === "created" && row.replayed ? "replayed" : row._tag;

/** A refused row's reason, in words, and its content's violations. */
interface RefusalText {
  readonly lines: readonly string[];
  readonly title: string;
}

/** A refused row's reason, and the content's violations when it has some. */
const useRefusalText = (channels: readonly Channel[]) => {
  const t = useTranslations();
  const violation = useViolationText(channels);

  return (refusal: PostRefusal): RefusalText => {
    const words = importRefusalWords(refusal);

    switch (words.key) {
      case "Posts.Composer.errors.content": {
        return {
          lines: words.violations.map(violation),
          title: t(words.key),
        };
      }

      case "Billing.limitReached": {
        return { lines: [], title: t(words.key, { limit: words.limit }) };
      }

      case "Posts.Composer.errors.queueNoRoom": {
        return {
          lines: [],
          title: t(words.key, { days: queueHorizonDays, reason: words.reason }),
        };
      }

      case "Posts.Import.refusal.duplicate":
      case "Posts.Import.refusal.keyReused": {
        return { lines: [], title: t(words.key, { hours: words.hours }) };
      }

      case "Posts.Import.refusal.unknownChannels":
      case "Posts.Import.refusal.unknownMedia":
      case "Posts.Import.refusal.unknownTags": {
        return { lines: [], title: t(words.key, { ids: words.ids }) };
      }

      case "Posts.Import.refusal.timeZone": {
        return { lines: [], title: t(words.key, { zone: words.zone }) };
      }

      case "Posts.Composer.errors.inPast":
      case "Posts.Composer.errors.queueNotFound":
      case "Posts.Import.refusal.duplicateInFile":
      case "Posts.Import.refusal.forbidden":
      case "Posts.Import.refusal.postGone":
      case "Posts.Import.refusal.unknownSet":
      case "Posts.Import.refusal.unknownSignature": {
        return { lines: [], title: t(words.key) };
      }

      default: {
        return words satisfies never;
      }
    }
  };
};

/** A row's cells that could not be read, in words. */
const useCellText = () => {
  const t = useTranslations();

  return (words: CellWords): string =>
    words.key === "Posts.Import.cell.count"
      ? t(words.key, { expected: words.expected, found: words.found })
      : t(words.key, { column: words.column });
};

/** The file input: a CSV file, chosen again to start over. */
export const ImportFileField = ({
  disabled,
  fileName,
  inputRef,
  onChoose,
}: {
  readonly disabled: boolean;
  /** The last file chosen, by its name. */
  readonly fileName: string | null;
  readonly inputRef?: Ref<HTMLInputElement>;
  readonly onChoose: (file: File) => void;
}) => {
  const t = useTranslations("Posts.Import");
  const id = useId();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{t("file")}</Label>
      <Input
        ref={inputRef}
        id={id}
        type="file"
        accept=".csv,text/csv"
        disabled={disabled}
        aria-describedby={`${id}-hint`}
        onChange={(event) => {
          const file = event.currentTarget.files?.item(0);

          // Emptied, so choosing the same file again, corrected, reads it
          // again.
          event.currentTarget.value = "";

          if (file !== null && file !== undefined) {
            onChoose(file);
          }
        }}
      />
      <p id={`${id}-hint`} className="text-muted-foreground text-sm">
        {fileName === null
          ? t("fileHint")
          : t("chosenFile", { name: fileName })}
      </p>
    </div>
  );
};

/** Each row of the file, by its number, with what became of it. */
export const ImportRowsTable = ({
  channels,
  postLinks,
  rows,
}: {
  readonly channels: readonly Channel[];
  /** A link to each post the import made, by the post's id. */
  readonly postLinks: ReadonlyMap<string, ReactNode>;
  readonly rows: readonly ImportRowResult[];
}) => {
  const t = useTranslations("Posts.Import");
  const refusalText = useRefusalText(channels);
  const cellText = useCellText();

  const detail = (row: ImportRowResult): ReactNode => {
    switch (row._tag) {
      case "valid": {
        return null;
      }

      case "created": {
        return postLinks.get(row.post.id) ?? null;
      }

      case "refused": {
        const { lines, title } = refusalText(row.refusal);

        return (
          <div className="flex flex-col gap-1">
            <p>{title}</p>
            {lines.length === 0 ? null : (
              <ul className="list-disc pl-4">
                {lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        );
      }

      case "unreadable": {
        return row.cells === undefined ? (
          <ul className="list-disc pl-4">
            {row.problems.map((problem) => (
              <li key={`${problem.column}-${problem.problem}`}>
                {cellText(cellWords(problem))}
              </li>
            ))}
          </ul>
        ) : (
          <p>{cellText(cellWords(row.cells))}</p>
        );
      }

      default: {
        return row satisfies never;
      }
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("row")}</TableHead>
          <TableHead>{t("result")}</TableHead>
          <TableHead className="sr-only">{t("detail")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.row}>
            <TableCell>{t("rowNumber", { row: row.row })}</TableCell>
            <TableCell>
              <Badge
                variant={
                  row._tag === "refused" || row._tag === "unreadable"
                    ? "destructive"
                    : "secondary"
                }
              >
                {t("rowState", { state: stateOf(row) })}
              </Badge>
            </TableCell>
            <TableCell className="whitespace-normal">{detail(row)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * Import, which asks once: how many posts will be scheduled, and that rows
 * dated now go out at once. The check's answer does not say which rows are
 * dated now, and the browser does not read the file to count them.
 */
export const ImportConfirm = ({
  busy,
  count,
  onConfirm,
}: {
  readonly busy: boolean;
  readonly count: number;
  readonly onConfirm: () => void;
}) => {
  const t = useTranslations("Posts.Import");
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          setConfirmed(false);
        }
      }}
    >
      <DialogTrigger render={<Button className="self-start" disabled={busy} />}>
        {busy ? t("importing") : t("import", { count })}
      </DialogTrigger>
      <DialogContent closeLabel={t("closeDialog")}>
        <DialogHeader>
          <DialogTitle>{t("confirmTitle")}</DialogTitle>
          <DialogDescription>
            {t("confirmDescription", { count })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("confirmCancel")}
          </DialogClose>
          <DialogClose
            render={<Button disabled={confirmed} />}
            onClick={() => {
              setConfirmed(true);
              onConfirm();
            }}
          >
            {t("confirmSubmit")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface ImportStateViewProps {
  readonly channels: readonly Channel[];
  readonly onChooseAgain: () => void;
  readonly onConfirm: () => void;
  readonly onRetry: () => void;
  readonly postLinks: ReadonlyMap<string, ReactNode>;
  readonly state: ImportState;
}

// What a finished import came to: every row made, or some refused since
// the check, with what to do about the others.
const ImportedSummary = ({
  onChooseAgain,
  rows,
}: {
  readonly onChooseAgain: () => void;
  readonly rows: readonly ImportRowResult[];
}) => {
  const t = useTranslations("Posts.Import");
  const refused = refusedMeanwhile(rows).length;

  const made = rows.filter(
    (row) => row._tag === "created" && !row.replayed
  ).length;

  const before = rows.filter(
    (row) => row._tag === "created" && row.replayed
  ).length;

  if (refused === 0) {
    return (
      <Alert>
        <AlertTitle>{t("done", { before, made })}</AlertTitle>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTitle>
        {made + before === 0
          ? t("noneMade", { refused })
          : t("meanwhile", { created: made + before, refused })}
      </AlertTitle>
      <AlertDescription>
        <Button variant="outline" size="sm" onClick={onChooseAgain}>
          {t("chooseCorrected")}
        </Button>
      </AlertDescription>
    </Alert>
  );
};

/** The screen below the file input, as the import stands. */
export const ImportStateView = ({
  channels,
  onChooseAgain,
  onConfirm,
  onRetry,
  postLinks,
  state,
}: ImportStateViewProps) => {
  const t = useTranslations("Posts.Import");
  const tAll = useTranslations();

  switch (state._tag) {
    case "idle": {
      return null;
    }

    case "fileRefused": {
      return (
        <Alert variant="destructive">
          <AlertTitle>
            {t("fileRefused", {
              length: maxImportLength,
              reason: state.reason,
            })}
          </AlertTitle>
        </Alert>
      );
    }

    case "checking": {
      return (
        <output className="text-muted-foreground text-sm" aria-busy>
          {t("checking")}
        </output>
      );
    }

    case "unreadable": {
      const words = unreadableWords(state.problem, state.column);

      return (
        <Alert variant="destructive">
          <AlertTitle>{t("unreadableTitle")}</AlertTitle>
          <AlertDescription>
            {tAll(words.key, {
              column: words.column,
              named: words.named,
              rows: maxImportRows,
            })}
          </AlertDescription>
        </Alert>
      );
    }

    case "checked":
    case "importing": {
      const keptOut = state.rows.filter(
        ({ _tag }) => _tag === "refused" || _tag === "unreadable"
      ).length;

      return (
        <section className="flex flex-col gap-4" aria-label={t("rows")}>
          {state.rows.length === 0 ? (
            <p>{t("noRows")}</p>
          ) : (
            <p>
              {keptOut === 0
                ? t("allValid", { count: state.rows.length })
                : t("someRefused", { count: keptOut })}
            </p>
          )}
          {canImport(state) || state._tag === "importing" ? (
            <ImportConfirm
              busy={isBusy(state)}
              count={state.rows.length}
              onConfirm={onConfirm}
            />
          ) : null}
          {state.rows.length === 0 ? null : (
            <ImportRowsTable
              channels={channels}
              postLinks={postLinks}
              rows={state.rows}
            />
          )}
        </section>
      );
    }

    case "imported": {
      return (
        <section className="flex flex-col gap-4" aria-label={t("rows")}>
          <ImportedSummary rows={state.rows} onChooseAgain={onChooseAgain} />
          <ImportRowsTable
            channels={channels}
            postLinks={postLinks}
            rows={state.rows}
          />
        </section>
      );
    }

    case "failed": {
      return (
        <Alert variant="destructive">
          <AlertTitle>{t("failed", { reason: state.reason })}</AlertTitle>
          <AlertDescription>
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      );
    }

    default: {
      return state satisfies never;
    }
  }
};

/** The workspace's channels, each id with a button that copies it. */
export const ImportChannelsView = ({
  channels,
  onCopy,
  sets,
}: {
  readonly channels: readonly Channel[];
  readonly onCopy: (channel: Channel) => void;
  /** The names of the workspace's channel sets. */
  readonly sets: readonly string[];
}) => {
  const t = useTranslations("Posts.Import.channels");

  return (
    <section className="flex flex-col gap-3" aria-labelledby="import-channels">
      <h2 id="import-channels" className="text-lg font-semibold">
        {t("title")}
      </h2>
      {channels.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("channel")}</TableHead>
              <TableHead>{t("id")}</TableHead>
              <TableHead className="sr-only">{t("copyColumn")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((channel) => (
              <TableRow key={channel.id}>
                <TableCell>{channelName(channel)}</TableCell>
                <TableCell>
                  <code className="text-xs">{channel.id}</code>
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={t("copy", { channel: channelName(channel) })}
                    onClick={() => {
                      onCopy(channel);
                    }}
                  >
                    {t("copyShort")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {sets.length === 0 ? null : (
        <p className="text-muted-foreground text-sm">
          {t("sets", { names: sets.join(", ") })}
        </p>
      )}
    </section>
  );
};

/** What the file holds, column by column, and a sample to start from. */
export const ImportHelpView = ({
  onDownloadSample,
}: {
  readonly onDownloadSample: () => void;
}) => {
  const t = useTranslations("Posts.Import.help");

  return (
    <section className="flex flex-col gap-3" aria-labelledby="import-help">
      <h2 id="import-help" className="text-lg font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm">
        {t("intro", { length: maxImportLength, rows: maxImportRows })}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("column")}</TableHead>
            <TableHead>{t("required")}</TableHead>
            <TableHead>{t("what")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {importColumns.map((column) => (
            <TableRow key={column}>
              <TableCell>
                <code className="text-xs">{column}</code>
              </TableCell>
              <TableCell>
                {requiredColumns.has(column) ? t("yes") : t("no")}
              </TableCell>
              <TableCell className="whitespace-normal">
                {t(`columns.${column}`)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        variant="outline"
        className="self-start"
        onClick={onDownloadSample}
      >
        {t("sample")}
      </Button>
    </section>
  );
};
