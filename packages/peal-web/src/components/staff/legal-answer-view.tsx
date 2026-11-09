import { DateTime } from "effect";
import { useTranslations } from "next-intl";
import type { LegalAnswer } from "peal-contract";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import type { ReactNode } from "react";

import { Instant } from "#components/staff/instant.tsx";
import { Fact } from "#components/staff/section.tsx";

type Held = LegalAnswer["held"][number];

// A category the request did not ask for: nothing of it was read out.
const NotCovered = () => {
  const t = useTranslations("Staff.legal.answer");

  return <span className="text-muted-foreground">{t("notCovered")}</span>;
};

// A covered list, which may hold nothing: emptied after its year, or never
// there.
const Listed = ({
  children,
  empty,
}: {
  readonly children: readonly ReactNode[];
  readonly empty: string;
}) =>
  children.length === 0 ? (
    <span className="text-muted-foreground">{empty}</span>
  ) : (
    <ul className="flex flex-col gap-1">{children}</ul>
  );

// What a request got of one closed account.
const HeldAccount = ({ account }: { readonly account: Held }) => {
  const t = useTranslations("Staff.legal.answer");

  return (
    <li className="rounded-lg border p-4">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label={t("userId")}>
          <code className="font-mono">{account.userId}</code>
        </Fact>
        <Fact label={t("closedAt")}>
          <Instant value={DateTime.formatIso(account.closedAt)} />
        </Fact>
        <Fact label={t("identity")}>
          {account.identity === null ? (
            <NotCovered />
          ) : (
            <span className="flex flex-col gap-1">
              <span>{account.identity.name}</span>
              <span>{account.identity.email}</span>
              <span className="text-muted-foreground">
                {t("createdAt")}{" "}
                <Instant
                  value={DateTime.formatIso(account.identity.accountCreatedAt)}
                />
              </span>
            </span>
          )}
        </Fact>
        <Fact label={t("signIn")}>
          {account.signInMethods === null ? (
            <NotCovered />
          ) : (
            <Listed empty={t("noneKept")}>
              {account.signInMethods.map(({ accountId, provider }) => (
                <li key={`${provider}:${accountId}`}>
                  {provider} <code className="font-mono">{accountId}</code>
                </li>
              ))}
            </Listed>
          )}
        </Fact>
        <Fact label={t("payments")}>
          {account.stripeCustomerIds === null ? (
            <NotCovered />
          ) : (
            <Listed empty={t("noneKept")}>
              {account.stripeCustomerIds.map((customer) => (
                <li key={customer}>
                  <code className="font-mono">{customer}</code>
                </li>
              ))}
            </Listed>
          )}
        </Fact>
      </dl>
    </li>
  );
};

// A value that may be missing from a connection.
const Cell = ({ value }: { readonly value: string | null }) =>
  value === null ? (
    <span className="text-muted-foreground">–</span>
  ) : (
    <code className="font-mono">{value}</code>
  );

const Connections = ({
  connections,
}: {
  readonly connections: NonNullable<LegalAnswer["connections"]>;
}) => {
  const t = useTranslations("Staff.legal.answer");

  if (connections.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">{t("noConnections")}</p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.at")}</TableHead>
          <TableHead>{t("columns.ipAddress")}</TableHead>
          <TableHead>{t("columns.protocol")}</TableHead>
          <TableHead>{t("columns.access")}</TableHead>
          <TableHead>{t("columns.userId")}</TableHead>
          <TableHead>{t("columns.apiKeyId")}</TableHead>
          <TableHead>{t("columns.workspaceId")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {connections.map((connection) => (
          <TableRow
            key={`${DateTime.formatIso(connection.at)}:${connection.userId ?? connection.apiKeyId ?? ""}:${connection.ipAddress ?? ""}`}
          >
            <TableCell>
              <Instant value={DateTime.formatIso(connection.at)} />
            </TableCell>
            <TableCell>
              <Cell value={connection.ipAddress} />
            </TableCell>
            <TableCell>{connection.protocol}</TableCell>
            <TableCell>{connection.access}</TableCell>
            <TableCell>
              <Cell value={connection.userId} />
            </TableCell>
            <TableCell>
              <Cell value={connection.apiKeyId} />
            </TableCell>
            <TableCell>
              <Cell value={connection.workspaceId} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * What a legal request got, once recorded: the record's id, the closed
 * accounts the subject names and the connections that made content, each
 * category only where the request covered it. What it did not cover reads
 * "Not covered by this request": the server sent none of it.
 */
export const LegalAnswerView = ({
  answer,
}: {
  readonly answer: LegalAnswer;
}) => {
  const t = useTranslations("Staff.legal.answer");

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        {t("recorded")} <code className="font-mono">{answer.id}</code>,{" "}
        <Instant value={DateTime.formatIso(answer.at)} />
      </p>
      <section className="flex flex-col gap-3">
        <h3 className="font-medium">{t("held")}</h3>
        {answer.held.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noHeld")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {answer.held.map((account) => (
              <HeldAccount
                key={`${account.userId}:${DateTime.formatIso(account.closedAt)}`}
                account={account}
              />
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="font-medium">{t("connections")}</h3>
        {answer.connections === null ? (
          <p className="text-sm">
            <NotCovered />
          </p>
        ) : (
          <Connections connections={answer.connections} />
        )}
      </section>
    </div>
  );
};
