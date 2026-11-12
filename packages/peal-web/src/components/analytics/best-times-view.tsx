import { useTranslations } from "next-intl";
import type { BestTimes, BestTimesHour } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

const weekdays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const hours = Array.from({ length: 24 }, (_, hour) => hour);

const keyOf = ({ hour, weekday }: Pick<BestTimesHour, "hour" | "weekday">) =>
  `${weekday}:${String(hour)}`;

// How strong a cell of the grid looks: its posts against the busiest hour.
const shade = (posts: number, busiest: number) => {
  if (posts === 0) {
    return "bg-muted";
  }

  const share = posts / Math.max(busiest, 1);

  if (share > 0.66) {
    return "bg-primary";
  }

  return share > 0.33 ? "bg-primary/60" : "bg-primary/30";
};

/**
 * When one channel's posts did best: the best hours, a weekday by hour
 * grid of how many posts went live in each (drawn for the eye alone), and
 * the same figures as a table, which screen readers read. Nothing is
 * ranked where the platform gives no counts or the channel has too few
 * posts, and it says so.
 */
export const BestTimesView = ({ found }: { readonly found: BestTimes }) => {
  const t = useTranslations("Analytics.bestTimes");
  const channels = useTranslations("ChannelsPage");
  const best = new Set(found.best.map(keyOf));
  const byKey = new Map(found.buckets.map((bucket) => [keyOf(bucket), bucket]));
  const busiest = Math.max(0, ...found.buckets.map(({ posts }) => posts));

  if (!found.counted) {
    return (
      <p className="text-muted-foreground text-sm">
        {t("notCounted", {
          platform: channels("platform", { platform: found.platform }),
        })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {found.enough ? null : (
        <p className="text-muted-foreground text-sm">
          {t("notEnough", {
            minimum: found.minimumPosts,
            posts: found.posts,
          })}
        </p>
      )}
      {found.enough ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{t("best")}</h3>
          {found.best.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t("none", { minimum: found.minimumPostsPerHour })}
            </p>
          ) : (
            <ol className="flex flex-wrap gap-2">
              {found.best.map((bucket) => (
                <li key={keyOf(bucket)}>
                  <Badge variant="secondary">
                    {t("slot", { hour: bucket.hour, weekday: bucket.weekday })}
                  </Badge>
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
      <div aria-hidden className="overflow-x-auto">
        <div className="grid min-w-xl grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-0.5 text-xs">
          <span />
          {hours.map((hour) => (
            <span key={hour} className="text-muted-foreground text-center">
              {hour % 6 === 0 ? hour : ""}
            </span>
          ))}
          {weekdays.map((weekday) => (
            <div key={weekday} className="contents">
              <span className="text-muted-foreground pe-2">
                {t("weekday", { weekday })}
              </span>
              {hours.map((hour) => {
                const bucket = byKey.get(keyOf({ hour, weekday }));

                return (
                  <span
                    key={hour}
                    data-best={best.has(keyOf({ hour, weekday })) || undefined}
                    className={`data-best:ring-foreground h-4 rounded-sm data-best:ring-2 ${shade(bucket?.posts ?? 0, busiest)}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <Table>
        <TableCaption>
          {t("tableCaption", { minimum: found.minimumPostsPerHour })}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>{t("hour")}</TableHead>
            <TableHead>{t("posts")}</TableHead>
            <TableHead>{t("median")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {found.buckets.map((bucket) => (
            <TableRow key={keyOf(bucket)}>
              <TableHead scope="row">
                {t("slot", { hour: bucket.hour, weekday: bucket.weekday })}
                {best.has(keyOf(bucket)) ? (
                  <Badge variant="outline" className="ms-2">
                    {t("bestMark")}
                  </Badge>
                ) : null}
              </TableHead>
              <TableCell variant="numeric">{bucket.posts}</TableCell>
              <TableCell variant="numeric">{bucket.median ?? "–"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-muted-foreground text-xs">
        {t("footnote", {
          from: found.from,
          recent: found.recent,
          to: found.to,
        })}
      </p>
    </div>
  );
};
