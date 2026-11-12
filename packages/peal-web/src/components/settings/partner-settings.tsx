"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import { partnerKeyPermissions, PartnerScopeSchema } from "peal-contract";
import type {
  CustomerHealth,
  Partner,
  PartnerKey,
  PartnerScope,
  PartnerUsage,
  Permission,
} from "peal-contract";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { FormField } from "#components/auth/form-field.tsx";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import {
  closePartner,
  createPartnerKey,
  openPartner,
  partnerChanged,
  partnerKeysChanged,
  partnerKeysOf,
  partnerOf,
  partnerHealthOf,
  partnerWorkspacesOf,
  revokePartnerKey,
  updatePartner,
} from "#partner/atoms.ts";
import { originsOf, originsText } from "#partner/origins.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";
import { apiErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

import { CreatedKey } from "./api-keys.tsx";
import { CustomerHealthLine } from "./partner-health.tsx";
import { UsagePerCustomer } from "./partner-usage.tsx";
import { SettingsError } from "./settings-error.tsx";
import { SettingsLoadFailed, SettingsLoading } from "./settings-status.tsx";

const unknown = (): SettingsErrorKey => "unknown";

// A workspace without an account: the form that opens one, where the
// server lets its people, or who to ask.
const OpenAccount = ({
  canOpen,
  mayManage,
  workspaceId,
}: {
  readonly canOpen: boolean;
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const open = useAtomSet(openPartner, { mode: "promiseExit" });
  const [name, setName] = useState("");
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!canOpen || !mayManage) {
    return <p>{t(canOpen ? "askOwner" : "askOperator")}</p>;
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const exit = await open({
        params: { workspaceId },
        payload: { name: name.trim() },
        reactivityKeys: partnerChanged(workspaceId),
      });

      setError(Option.getOrNull(apiErrorKey(exit)));
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <p>{t("openIntro")}</p>
      <SettingsError error={error} />
      <FormField
        id="partner-name"
        type="text"
        autoComplete="organization"
        label={t("name")}
        hint={t("nameHint")}
        value={name}
        onChange={setName}
      />
      <div>
        <Button
          type="submit"
          disabled={isPending || name.trim() === ""}
          focusableWhenDisabled
        >
          {isPending ? t("opening") : t("open")}
        </Button>
      </div>
    </form>
  );
};

// What the account's customers see, and where hosted pages may send them
// back.
const AccountForm = ({
  partner,
  workspaceId,
}: {
  readonly partner: Partner;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const settings = useTranslations("Settings");
  const originsId = useId();
  const update = useAtomSet(updatePartner, { mode: "promiseExit" });
  const [name, setName] = useState(partner.name);
  const [logoUrl, setLogoUrl] = useState(partner.logoUrl ?? "");
  const [origins, setOrigins] = useState(originsText(partner.returnOrigins));
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const exit = await update({
        params: { workspaceId },
        payload: {
          logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
          name: name.trim(),
          returnOrigins: originsOf(origins),
        },
        reactivityKeys: partnerChanged(workspaceId),
      });

      setError(Option.getOrNull(apiErrorKey(exit)));

      if (Exit.isSuccess(exit)) {
        toast.success(t("saved"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-4">
      <SettingsError error={error} />
      <FormField
        id="partner-name"
        type="text"
        autoComplete="organization"
        label={t("name")}
        hint={t("nameHint")}
        value={name}
        onChange={setName}
      />
      <FormField
        id="partner-logo"
        type="text"
        autoComplete="off"
        label={t("logo")}
        hint={t("logoHint")}
        value={logoUrl}
        onChange={setLogoUrl}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={originsId}>{t("origins")}</Label>
        <Textarea
          id={originsId}
          rows={3}
          spellCheck={false}
          aria-describedby={`${originsId}-hint`}
          value={origins}
          onChange={(event) => {
            setOrigins(event.target.value);
          }}
        />
        <p id={`${originsId}-hint`} className="text-muted-foreground text-sm">
          {t("originsHint")}
        </p>
      </div>
      <div>
        <Button
          type="submit"
          disabled={isPending || name.trim() === ""}
          focusableWhenDisabled
        >
          {isPending ? settings("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
};

// One thing a new key may do, by its name in the API.
const Choice = ({
  checked,
  disabled,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}) => {
  const id = useId();

  return (
    <div className="flex items-center gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <Label htmlFor={id}>
        <code className="font-mono text-sm">{label}</code>
      </Label>
    </div>
  );
};

const toggledIn = <A,>(
  chosen: ReadonlySet<A>,
  value: A,
  checked: boolean
): ReadonlySet<A> => {
  const next = new Set(chosen);

  if (checked) {
    next.add(value);
  } else {
    next.delete(value);
  }

  return next;
};

// A new key: its name, what it may do with the account's workspaces, and
// what it may do inside each.
const CreateKeyForm = ({
  onCreated,
  workspaceId,
}: {
  readonly onCreated: (key: string) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const create = useAtomSet(createPartnerKey, { mode: "promiseExit" });
  const [name, setName] = useState("");

  const [scopes, setScopes] = useState<ReadonlySet<PartnerScope>>(
    new Set(PartnerScopeSchema.literals)
  );

  const [permissions, setPermissions] = useState<ReadonlySet<Permission>>(
    new Set(partnerKeyPermissions)
  );

  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const exit = await create({
        params: { workspaceId },
        payload: {
          name: name.trim(),
          permissions: partnerKeyPermissions.filter((permission) =>
            permissions.has(permission)
          ),
          scopes: PartnerScopeSchema.literals.filter((scope) =>
            scopes.has(scope)
          ),
        },
        reactivityKeys: partnerKeysChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        setError(null);
        setName("");
        onCreated(exit.value.key);
      } else {
        setError(Option.getOrElse(apiErrorKey(exit), unknown));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SettingsError error={error} />
      <div className="max-w-sm">
        <FormField
          id="partner-key-name"
          type="text"
          autoComplete="off"
          label={t("keyName")}
          hint={t("keyNameHint")}
          value={name}
          onChange={setName}
        />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">{t("scopes")}</legend>
        <p className="text-muted-foreground text-sm">{t("scopesHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PartnerScopeSchema.literals.map((scope) => (
            <Choice
              key={scope}
              checked={scopes.has(scope)}
              disabled={isPending}
              label={scope}
              onChange={(checked) => {
                setScopes((before) => toggledIn(before, scope, checked));
              }}
            />
          ))}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">{t("permissions")}</legend>
        <p className="text-muted-foreground text-sm">{t("permissionsHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {partnerKeyPermissions.map((permission) => (
            <Choice
              key={permission}
              checked={permissions.has(permission)}
              disabled={isPending}
              label={permission}
              onChange={(checked) => {
                setPermissions((before) =>
                  toggledIn(before, permission, checked)
                );
              }}
            />
          ))}
        </div>
      </fieldset>
      <div>
        <Button
          type="submit"
          disabled={isPending || name.trim() === ""}
          focusableWhenDisabled
        >
          {isPending ? t("creatingKey") : t("createKey")}
        </Button>
      </div>
    </form>
  );
};

const KeyRow = ({
  mayManage,
  partnerKey,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly partnerKey: PartnerKey;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const errors = useTranslations("Settings.errors");
  const format = useFormatter();
  const revoke = useAtomSet(revokePartnerKey, { mode: "promiseExit" });
  const [isRevoking, startRevoke] = useTransition();

  const handleRevoke = () => {
    startRevoke(async () => {
      const exit = await revoke({
        params: { partnerKeyId: partnerKey.id, workspaceId },
        reactivityKeys: partnerKeysChanged(workspaceId),
      });

      Option.match(apiErrorKey(exit), {
        onNone: () => {
          toast.success(t("keyRevoked", { name: partnerKey.name }));
        },
        onSome: (key) => {
          toast.error(errors(key));
        },
      });
    });
  };

  return (
    <li className="flex flex-wrap items-start gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium">{partnerKey.name}</span>
        <span className="text-muted-foreground font-mono text-sm">
          {t("keyStartsWith", { start: partnerKey.start })}
        </span>
        <span className="text-muted-foreground text-sm">
          {t("keyCreated", {
            created: format.dateTime(DateTime.toDate(partnerKey.createdAt), {
              dateStyle: "medium",
            }),
          })}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {[...partnerKey.scopes, ...partnerKey.permissions].join(" ")}
        </span>
      </div>
      {mayManage ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isRevoking}
          focusableWhenDisabled
          aria-label={t("revokeKey", { name: partnerKey.name })}
          onClick={handleRevoke}
        >
          {isRevoking ? t("revokingKey") : t("revoke")}
        </Button>
      ) : null}
    </li>
  );
};

const Keys = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const atom = partnerKeysOf(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">{t("noKeys")}</p>
      ) : (
        <ul className="divide-y">
          {value.map((partnerKey) => (
            <KeyRow
              key={partnerKey.id}
              mayManage={mayManage}
              partnerKey={partnerKey}
              workspaceId={workspaceId}
            />
          ))}
        </ul>
      ),
  });
};

// The newest workspaces the account owns, each with its channels.
const Workspaces = ({ workspaceId }: { readonly workspaceId: string }) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const atom = partnerWorkspacesOf(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  // What needs attention in each, when it can be read: the list shows
  // without it otherwise.
  const health = AsyncResult.match(useAtomValue(partnerHealthOf(workspaceId)), {
    onFailure: () => new Map<string, CustomerHealth>(),
    onInitial: () => new Map<string, CustomerHealth>(),
    onSuccess: ({ value }) =>
      new Map(value.workspaces.map((customer) => [customer.id, customer])),
  });

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.workspaces.length === 0 ? (
        <p className="text-muted-foreground">{t("noWorkspaces")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <ul className="divide-y">
            {value.workspaces.map((owned) => (
              <li key={owned.id} className="flex flex-col gap-1 py-3">
                <span className="font-medium">{owned.name}</span>
                <span className="text-muted-foreground text-sm">
                  {t("workspaceLine", {
                    channels: owned.channels,
                    externalId: owned.externalId ?? "none",
                  })}
                </span>
                <CustomerHealthLine health={health.get(owned.id)} />
                <span className="text-muted-foreground font-mono text-xs">
                  {owned.id}
                </span>
              </li>
            ))}
          </ul>
          {value.total > value.workspaces.length ? (
            <p className="text-muted-foreground text-sm">
              {t("moreWorkspaces", {
                shown: value.workspaces.length,
                total: value.total,
              })}
            </p>
          ) : null}
        </div>
      ),
  });
};

// Closing the account, which its keys do not survive.
const CloseAccount = ({ workspaceId }: { readonly workspaceId: string }) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const close = useAtomSet(closePartner, { mode: "promiseExit" });
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleClose = () => {
    startTransition(async () => {
      const exit = await close({
        params: { workspaceId },
        reactivityKeys: partnerChanged(workspaceId),
      });

      setError(Option.getOrNull(apiErrorKey(exit)));
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-sm">{t("closeHint")}</p>
      <SettingsError error={error} />
      <div>
        <Button
          variant="destructive"
          disabled={isPending}
          focusableWhenDisabled
          onClick={handleClose}
        >
          {isPending ? t("closing") : t("close")}
        </Button>
      </div>
    </div>
  );
};

const Section = ({
  children,
  title,
}: {
  readonly children: React.ReactNode;
  readonly title: string;
}) => {
  const id = useId();

  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
};

// An account, with everything its people do with it.
const Account = ({
  mayManage,
  partner,
  usage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly partner: Partner;
  readonly usage: PartnerUsage | null;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.partner");
  const [created, setCreated] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-8">
      {usage === null ? null : (
        <p>
          {t("usage", {
            channels: usage.channels,
            workspaces: usage.workspaces,
          })}
        </p>
      )}
      <Section title={t("accountTitle")}>
        {mayManage ? (
          <AccountForm partner={partner} workspaceId={workspaceId} />
        ) : (
          <p>{partner.name}</p>
        )}
      </Section>
      <Section title={t("keysTitle")}>
        <p className="text-muted-foreground text-sm">{t("keysHint")}</p>
        {created === null ? null : (
          <CreatedKey
            apiKey={created}
            onDone={() => {
              setCreated(null);
            }}
          />
        )}
        <Keys mayManage={mayManage} workspaceId={workspaceId} />
        {mayManage ? (
          <CreateKeyForm workspaceId={workspaceId} onCreated={setCreated} />
        ) : null}
      </Section>
      <Section title={t("workspacesTitle")}>
        <Workspaces workspaceId={workspaceId} />
      </Section>
      <Section title={t("usageReport.title")}>
        <UsagePerCustomer workspaceId={workspaceId} />
      </Section>
      {mayManage ? (
        <Section title={t("closeTitle")}>
          <CloseAccount workspaceId={workspaceId} />
        </Section>
      ) : null}
    </div>
  );
};

const Loaded = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const atom = partnerOf(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.partner === null ? (
        <OpenAccount
          canOpen={value.canOpen}
          mayManage={mayManage}
          workspaceId={workspaceId}
        />
      ) : (
        <Account
          key={value.partner.id}
          mayManage={mayManage}
          partner={value.partner}
          usage={value.usage}
          workspaceId={workspaceId}
        />
      ),
  });
};

/**
 * A workspace's partner account: opening it where the server lets its
 * people, what its customers see of it, where hosted pages send them
 * back, its keys, the workspaces it owns, and what each used.
 */
export const PartnerSettings = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const hydrated = useHydrated();

  return hydrated ? (
    <InTimeZone timeZone={browserTimeZone()}>
      <Loaded mayManage={mayManage} workspaceId={workspaceId} />
    </InTimeZone>
  ) : (
    <SettingsLoading />
  );
};
