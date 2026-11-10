import type { StaffPartner } from "peal-contract";

import { GrantPartner } from "#components/staff/grant-partner.tsx";
import { Fact } from "#components/staff/section.tsx";
import { Link } from "#i18n/navigation.ts";

/**
 * Where a workspace stands with partner accounts: its own account and the
 * workspaces it owns, the partner that owns it, or neither, with the way
 * to grant it one.
 */
export const PartnerPosition = ({
  labels,
  partner,
  workspaceId,
}: {
  readonly labels: {
    readonly account: string;
    readonly externalId: string;
    readonly home: string;
    readonly noExternalId: string;
    readonly none: string;
    readonly owned: string;
    readonly workspaces: string;
  };
  readonly partner: StaffPartner;
  readonly workspaceId: string;
}) => {
  const { account, owner } = partner;

  if (account !== null) {
    return (
      <dl className="grid gap-4 sm:grid-cols-3">
        <Fact label={labels.account}>{account.name}</Fact>
        <Fact label={labels.workspaces}>{account.workspaces}</Fact>
      </dl>
    );
  }

  if (owner !== null) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">{labels.owned}</p>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Fact label={labels.home}>
            <Link href={`/admin/workspaces/${owner.homeWorkspaceId}`}>
              <code>{owner.homeWorkspaceId}</code>
            </Link>
          </Fact>
          <Fact label={labels.externalId}>
            {owner.externalId ?? labels.noExternalId}
          </Fact>
        </dl>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">{labels.none}</p>
      <GrantPartner workspaceId={workspaceId} />
    </div>
  );
};
