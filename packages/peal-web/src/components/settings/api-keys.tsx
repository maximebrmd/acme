"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { DateTime, Exit, Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import type { ApiKey, NewApiKey, Permission } from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { FormField } from "#components/auth/form-field.tsx";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { browserTimeZone } from "#posts/zoned-time.ts";
import { mayPublish } from "#settings/api-key-publishing.ts";
import {
  apiKeysChanged,
  createApiKey,
  revokeApiKey,
  workspaceApiKeys,
} from "#settings/atoms.ts";
import { apiErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

import { SettingsError } from "./settings-error.tsx";
import { SettingsLoadFailed, SettingsLoading } from "./settings-status.tsx";

// How long a new key works: until revoked, or for a number of days.
const ExpirySchema = Schema.Literals(["never", "30", "90", "365"]);

type Expiry = typeof ExpirySchema.Type;

const isExpiry = Schema.is(ExpirySchema);

const expiryDays: Readonly<Record<Expiry, number | undefined>> = {
  "30": 30,
  "365": 365,
  "90": 90,
  never: undefined,
};

/** The key just created, shown this once, to copy before it goes. */
export const CreatedKey = ({
  apiKey,
  onDone,
}: {
  readonly apiKey: string;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("WorkspaceSettings.apiKeys");
  const keyId = useId();

  const handleCopy = () => {
    void navigator.clipboard
      .writeText(apiKey)
      .then(() => toast.success(t("copied")))
      .catch(() => toast.error(t("copyFailed")));
  };

  return (
    <Alert>
      <AlertTitle>{t("createdTitle")}</AlertTitle>
      <AlertDescription>
        <span className="flex flex-col gap-3">
          {t("createdDescription")}
          <Label htmlFor={keyId} className="sr-only">
            {t("createdLabel")}
          </Label>
          <Input
            id={keyId}
            readOnly
            value={apiKey}
            onFocus={(event) => {
              event.target.select();
            }}
          />
          <span className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {t("copy")}
            </Button>
            <Button size="sm" onClick={onDone}>
              {t("done")}
            </Button>
          </span>
        </span>
      </AlertDescription>
    </Alert>
  );
};

// One permission a new key may be given, by its name in the API.
const PermissionChoice = ({
  checked,
  disabled,
  onChange,
  permission,
}: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly permission: Permission;
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
        <code className="font-mono text-sm">{permission}</code>
      </Label>
    </div>
  );
};

// A new key: its name, how long it works, and what it may do, out of what
// the member holds.
const CreateKeyForm = ({
  grantable,
  onCreated,
  workspaceId,
}: {
  readonly grantable: readonly Permission[];
  readonly onCreated: (key: string) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.apiKeys");
  const expiryId = useId();
  const create = useAtomSet(createApiKey, { mode: "promiseExit" });
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState<Expiry>("90");
  const [chosen, setChosen] = useState<ReadonlySet<Permission>>(new Set());
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const [first, ...rest] = grantable.filter((permission) =>
    chosen.has(permission)
  );

  const handleExpiry = (value: string | null) => {
    if (value !== null && isExpiry(value)) {
      setExpiry(value);
    }
  };

  const handleChosen = (permission: Permission) => (checked: boolean) => {
    setChosen((before) => {
      const next = new Set(before);

      if (checked) {
        next.add(permission);
      } else {
        next.delete(permission);
      }

      return next;
    });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (first === undefined) {
      return;
    }

    startTransition(async () => {
      const days = expiryDays[expiry];

      const asked: Pick<NewApiKey, "name" | "permissions"> = {
        name: name.trim(),
        permissions: [first, ...rest],
      };

      // A key without an expiry works until it is revoked.
      const payload: NewApiKey =
        days === undefined ? asked : { ...asked, expiresInDays: days };

      const exit = await create({
        params: { workspaceId },
        payload,
        reactivityKeys: apiKeysChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        setError(null);
        setName("");
        setChosen(new Set());
        onCreated(exit.value.key);
      } else {
        setError(Option.getOrElse(apiErrorKey(exit), () => "unknown"));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <SettingsError error={error} />
      <div className="max-w-sm">
        <FormField
          id="api-key-name"
          type="text"
          autoComplete="off"
          label={t("name")}
          hint={t("nameHint")}
          value={name}
          onChange={setName}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label id={expiryId}>{t("expiry")}</Label>
        <Select
          value={expiry}
          disabled={isPending}
          onValueChange={handleExpiry}
        >
          <SelectTrigger aria-labelledby={expiryId}>
            <SelectValue>{t("expiresIn", { days: expiry })}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ExpirySchema.literals.map((option) => (
              <SelectItem key={option} value={option}>
                {t("expiresIn", { days: option })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">{t("permissions")}</legend>
        <p className="text-muted-foreground text-sm">{t("permissionsHint")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {grantable.map((permission) => (
            <PermissionChoice
              key={permission}
              checked={chosen.has(permission)}
              disabled={isPending}
              permission={permission}
              onChange={handleChosen(permission)}
            />
          ))}
        </div>
      </fieldset>
      <div>
        <Button
          type="submit"
          disabled={isPending || first === undefined || name.trim() === ""}
          focusableWhenDisabled
        >
          {isPending ? t("creating") : t("create")}
        </Button>
      </div>
    </form>
  );
};

/** Whether a key may send posts out, which its list of permissions hides. */
export const KeyPublishing = ({
  permissions,
}: {
  readonly permissions: readonly Permission[];
}) => {
  const t = useTranslations("WorkspaceSettings.apiKeys");
  const allowed = mayPublish(permissions);

  return (
    <Badge variant={allowed ? "secondary" : "outline"}>
      {t("publishing", { allowed: allowed ? "yes" : "no" })}
    </Badge>
  );
};

// One key: its name, how it starts, what it may do and until when, and
// revoking it once confirmed.
const KeyRow = ({
  apiKey,
  mayRevoke,
  workspaceId,
}: {
  readonly apiKey: ApiKey;
  readonly mayRevoke: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.apiKeys");
  const settings = useTranslations("Settings");
  const errors = useTranslations("Settings.errors");
  const format = useFormatter();
  const revoke = useAtomSet(revokeApiKey, { mode: "promiseExit" });
  const [isRevoking, startRevoke] = useTransition();

  const when = (instant: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(instant), { dateStyle: "medium" });

  const handleRevoke = () => {
    startRevoke(async () => {
      const exit = await revoke({
        params: { apiKeyId: apiKey.id, workspaceId },
        reactivityKeys: apiKeysChanged(workspaceId),
      });

      Option.match(apiErrorKey(exit), {
        onNone: () => {
          toast.success(t("revoked", { name: apiKey.name }));
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
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{apiKey.name}</span>
          <KeyPublishing permissions={apiKey.permissions} />
        </span>
        {apiKey.start === null ? null : (
          <span className="text-muted-foreground font-mono text-sm">
            {t("startsWith", { start: apiKey.start })}
          </span>
        )}
        <span className="text-muted-foreground text-sm">
          {t("dates", {
            created: when(apiKey.createdAt),
            expires:
              apiKey.expiresAt === null ? "never" : when(apiKey.expiresAt),
          })}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {apiKey.permissions.join(" ")}
        </span>
      </div>
      {mayRevoke ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                disabled={isRevoking}
                focusableWhenDisabled
                aria-label={
                  isRevoking ? undefined : t("revokeKey", { name: apiKey.name })
                }
              />
            }
          >
            {isRevoking ? t("revoking") : t("revoke")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("revokeTitle", { name: apiKey.name })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("revokeDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleRevoke}>
                {t("revoke")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </li>
  );
};

const LoadedKeys = ({
  mayRevoke,
  workspaceId,
}: {
  readonly mayRevoke: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.apiKeys");
  const atom = workspaceApiKeys(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {value.map((apiKey) => (
            <KeyRow
              key={apiKey.id}
              apiKey={apiKey}
              mayRevoke={mayRevoke}
              workspaceId={workspaceId}
            />
          ))}
        </ul>
      ),
  });
};

/**
 * The workspace's API keys, for scripts and integrations: the list, a form
 * to create one with some of the member's own permissions, and the key
 * itself once, right after.
 */
export const ApiKeysSettings = ({
  grantable,
  mayCreate,
  mayRevoke,
  workspaceId,
}: {
  readonly grantable: readonly Permission[];
  readonly mayCreate: boolean;
  readonly mayRevoke: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.apiKeys");
  const hydrated = useHydrated();
  const [created, setCreated] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-8">
      {created === null ? null : (
        <CreatedKey
          apiKey={created}
          onDone={() => {
            setCreated(null);
          }}
        />
      )}
      <section aria-labelledby="keys-title" className="flex flex-col gap-2">
        <h2 id="keys-title" className="text-xl font-semibold">
          {t("listTitle")}
        </h2>
        {hydrated ? (
          <InTimeZone timeZone={browserTimeZone()}>
            <LoadedKeys mayRevoke={mayRevoke} workspaceId={workspaceId} />
          </InTimeZone>
        ) : (
          <SettingsLoading />
        )}
      </section>
      {mayCreate ? (
        <section
          aria-labelledby="create-key-title"
          className="flex flex-col gap-4"
        >
          <h2 id="create-key-title" className="text-xl font-semibold">
            {t("createTitle")}
          </h2>
          <CreateKeyForm
            grantable={grantable}
            workspaceId={workspaceId}
            onCreated={setCreated}
          />
        </section>
      ) : null}
    </div>
  );
};
