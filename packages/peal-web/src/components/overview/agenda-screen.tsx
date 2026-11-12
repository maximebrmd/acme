"use client";

import { useAtomValue } from "@effect/atom-react";
import { DateTime, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import type { AgendaItem } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { Skeleton } from "peal-ui/components/skeleton";
import { useId, useState } from "react";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { Link } from "#i18n/navigation.ts";
import { agendaPage } from "#overview/atoms.ts";

import { agendaDays, AgendaDaysView } from "./overview-views.tsx";

const days = 14;

// The filter's value for every workspace: no workspace id is so.
const everyWorkspace = "all";

const postLink = (href: string, label: string) => (
  <Link href={href} className="underline-offset-4 hover:underline">
    {label}
  </Link>
);

const LoadingAgenda = () => {
  const t = useTranslations("Overview.agenda");

  return (
    <div className="flex flex-col gap-3" aria-busy>
      <span className="sr-only">{t("loading")}</span>
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  );
};

interface PagesProps {
  readonly before: readonly AgendaItem[];
  readonly cursor: Option.Option<string>;
  readonly from: DateTime.Utc;
  readonly more: number;
  readonly onMore: () => void;
  /** Reads the agenda again from now, from its first page. */
  readonly onReload: () => void;
  readonly to: DateTime.Utc;
  readonly workspaceId: Option.Option<string>;
  readonly workspaceNames: ReadonlyMap<string, string>;
}

// A page of the agenda, then the pages after it that "Load more" opened,
// drawn together so a day that runs over two pages has one heading.
const AgendaPages = ({
  before,
  cursor,
  from,
  more,
  onMore,
  onReload,
  to,
  workspaceId,
  workspaceNames,
}: PagesProps) => {
  const t = useTranslations("Overview.agenda");
  const format = useFormatter();
  const page = agendaPage({ cursor, from, to, workspaceId });
  const result = useAtomValue(page);

  return AsyncResult.match(result, {
    onFailure: () => (
      <Alert variant="destructive">
        <AlertDescription>
          <span className="flex flex-wrap items-center justify-between gap-2">
            {t("loadFailed")}
            <Button variant="outline" size="sm" onClick={onReload}>
              {t("reload")}
            </Button>
          </span>
        </AlertDescription>
      </Alert>
    ),
    onInitial: () => <LoadingAgenda />,
    onSuccess: ({ value }) => {
      const items = [...before, ...value.items];
      const next = Option.fromNullOr(value.nextCursor);

      if (Option.isSome(next) && more > 0) {
        return (
          <AgendaPages
            before={items}
            cursor={next}
            from={from}
            more={more - 1}
            to={to}
            workspaceId={workspaceId}
            workspaceNames={workspaceNames}
            onMore={onMore}
            onReload={onReload}
          />
        );
      }

      if (items.length === 0) {
        return <p className="text-muted-foreground">{t("empty")}</p>;
      }

      // Days in the reader's zone, which the provider holds once hydrated.
      const byDay = agendaDays(items, (item) =>
        format.dateTime(DateTime.toDate(item.scheduledAt), {
          dateStyle: "full",
        })
      );

      return (
        <>
          <AgendaDaysView
            days={byDay}
            linkTo={postLink}
            workspaceNames={workspaceNames}
          />
          {Option.isSome(next) ? (
            <Button variant="outline" className="self-center" onClick={onMore}>
              {t("loadMore")}
            </Button>
          ) : null}
        </>
      );
    },
  });
};

// The next 14 days from when the page was opened, in the browser.
const AgendaFromNow = ({
  workspaceId,
  workspaceNames,
}: {
  readonly workspaceId: Option.Option<string>;
  readonly workspaceNames: ReadonlyMap<string, string>;
}) => {
  // The moment the page was opened, kept while it stays open.
  const [from, setFrom] = useState(() => DateTime.nowUnsafe());
  const [more, setMore] = useState(0);
  const to = DateTime.add(from, { days });

  const handleMore = () => {
    setMore((current) => current + 1);
  };

  const handleReload = () => {
    setMore(0);
    setFrom(DateTime.nowUnsafe());
  };

  return (
    <AgendaPages
      before={[]}
      cursor={Option.none()}
      from={from}
      more={more}
      to={to}
      workspaceId={workspaceId}
      workspaceNames={workspaceNames}
      onMore={handleMore}
      onReload={handleReload}
    />
  );
};

/**
 * The agenda across the person's workspaces, with a filter by workspace.
 * It is read with the visitor's cookies and the current time, so it is
 * drawn once the page has hydrated.
 */
export const AgendaScreen = ({
  workspaces,
}: {
  readonly workspaces: readonly {
    readonly id: string;
    readonly name: string;
  }[];
}) => {
  const t = useTranslations("Overview.agenda");
  const hydrated = useHydrated();
  const filterId = useId();
  const [chosen, setChosen] = useState(everyWorkspace);
  const names = new Map(workspaces.map(({ id, name }) => [id, name]));

  const handleChoose = (value: string | null) => {
    setChosen(value ?? everyWorkspace);
  };

  const workspaceId =
    chosen === everyWorkspace ? Option.none() : Option.some(chosen);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label id={filterId}>{t("filter")}</Label>
        <Select value={chosen} onValueChange={handleChoose}>
          <SelectTrigger aria-labelledby={filterId}>
            <SelectValue>
              {chosen === everyWorkspace
                ? t("allWorkspaces")
                : (names.get(chosen) ?? chosen)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={everyWorkspace}>{t("allWorkspaces")}</SelectItem>
            {workspaces.map(({ id, name }) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {hydrated ? (
        <AgendaFromNow
          key={chosen}
          workspaceId={workspaceId}
          workspaceNames={names}
        />
      ) : (
        <LoadingAgenda />
      )}
    </section>
  );
};
