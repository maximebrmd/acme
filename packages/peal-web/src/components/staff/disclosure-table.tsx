import { DateTime } from "effect";
import { getFormatter, getTranslations } from "next-intl/server";
import type { LegalDisclosure } from "peal-contract";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { Instant } from "#components/staff/instant.tsx";
import { Link } from "#i18n/navigation.ts";

// What a request asked about: the kind of identifier, and the identifier.
const Subject = async ({
  subject,
}: {
  readonly subject: LegalDisclosure["subject"];
}) => {
  const t = await getTranslations("Staff.legal.past");
  const [named] = Object.entries(subject);

  if (named === undefined) {
    return null;
  }

  const [kind, identifier] = named;

  return (
    <span className="flex flex-col gap-1">
      <span className="text-muted-foreground text-sm">
        {t("subject", { kind })}
      </span>
      <code className="font-mono break-all">{identifier}</code>
    </span>
  );
};

// The period of the connections a request named, if it named one, in the
// UTC days it was entered in.
const Period = async ({
  disclosure,
}: {
  readonly disclosure: LegalDisclosure;
}) => {
  const t = await getTranslations("Staff.legal.past");
  const format = await getFormatter();

  if (disclosure.since === null && disclosure.until === null) {
    return null;
  }

  const day = (instant: DateTime.Utc) =>
    format.dateTime(DateTime.toDateUtc(instant), {
      dateStyle: "medium",
      timeZone: "UTC",
    });

  return (
    <span className="text-muted-foreground block text-sm">
      {t("period", {
        since: disclosure.since === null ? t("open") : day(disclosure.since),
        until: disclosure.until === null ? t("now") : day(disclosure.until),
      })}
    </span>
  );
};

// The answers given to legal requests, newest first: what was asked, by
// whom and on what grounds, and how much it returned, never the data.
export const DisclosureTable = async ({
  disclosures,
}: {
  readonly disclosures: readonly LegalDisclosure[];
}) => {
  const t = await getTranslations("Staff.legal.past");

  if (disclosures.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.at")}</TableHead>
          <TableHead>{t("columns.staff")}</TableHead>
          <TableHead>{t("columns.authority")}</TableHead>
          <TableHead>{t("columns.legalBasis")}</TableHead>
          <TableHead>{t("columns.subject")}</TableHead>
          <TableHead>{t("columns.covers")}</TableHead>
          <TableHead>{t("columns.returned")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {disclosures.map((disclosure) => (
          <TableRow key={disclosure.id}>
            <TableCell>
              <Instant value={DateTime.formatIso(disclosure.at)} />
            </TableCell>
            <TableCell>
              <Link href={`/admin/users/${disclosure.staffId}`}>
                <code className="font-mono">{disclosure.staffId}</code>
              </Link>
            </TableCell>
            <TableCell className="whitespace-normal">
              {disclosure.authority}
              <span className="text-muted-foreground block text-sm">
                {disclosure.reference}
              </span>
            </TableCell>
            <TableCell className="whitespace-normal">
              {disclosure.legalBasis}
            </TableCell>
            <TableCell>
              <Subject subject={disclosure.subject} />
            </TableCell>
            <TableCell className="whitespace-normal">
              {disclosure.covers
                .map((cover) => t("cover", { cover }))
                .join(", ")}
              <Period disclosure={disclosure} />
            </TableCell>
            <TableCell className="whitespace-normal">
              {t("returned", {
                connections: disclosure.connections,
                held: disclosure.held,
              })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
