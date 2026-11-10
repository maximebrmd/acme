import { Option, Schema } from "effect";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Alert, AlertDescription } from "peal-ui/components/alert";

import { currentUserOrNone } from "#auth/session.ts";
import { ContractFunction } from "#components/contract/contract-function.tsx";

import type { FunctionKind, OwnContract } from "./form.ts";
import { contractFunctions } from "./functions.ts";

const decodeText = Schema.decodeUnknownOption(Schema.NonEmptyString);

/**
 * The page of a contract function, for anyone: its title under the words
 * the law gives the function, what it does, and its rubrics, prefilled for
 * a signed-in member with the contracts they manage. `workspaceId` is the
 * contract the billing page sent them for. Staff acting as someone get
 * the plain form: they end no contract in a member's name.
 */
export const ContractFunctionPage = async ({
  kind,
  workspaceId,
}: {
  readonly kind: FunctionKind;
  readonly workspaceId: string | null;
}) => {
  // Read at request time: the server's settings and the visitor's session.
  await connection();

  const t = await getTranslations("Contract");
  const name = kind === "cancellation" ? "cancel" : "withdraw";
  const functions = await contractFunctions();

  const visitor = await currentUserOrNone();

  const me = visitor.pipe(
    Option.filter(({ impersonatedBy }) => impersonatedBy === null)
  );

  const own: readonly OwnContract[] = Option.match(me, {
    onNone: () => [],
    onSome: ({ workspaces }) =>
      workspaces
        .filter(({ permissions }) => permissions.includes("billing:manage"))
        .map(({ id, name: workspace }) => ({ id, name: workspace })),
  });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t(`${name}.title`)}
        </h1>
        <p className="text-muted-foreground">{t(`${name}.description`)}</p>
      </div>
      {functions.enabled ? (
        <ContractFunction
          kind={kind}
          own={own}
          captchaSiteKey={functions.turnstileSiteKey}
          workspaceId={workspaceId}
          signedIn={Option.match(me, {
            onNone: () => null,
            onSome: ({ user }) => ({ email: user.email, name: user.name }),
          })}
        />
      ) : (
        <Alert>
          <AlertDescription>{t("errors.notEnabled")}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

/** The `workspace` of a page's query, when it names one. */
export const workspaceOf = (
  query: Readonly<Record<string, string | string[] | undefined>>
): string | null => decodeText(query["workspace"]).pipe(Option.getOrNull);
