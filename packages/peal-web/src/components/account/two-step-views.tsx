"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import { QRCodeSVG } from "qrcode.react";
import { useId } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import type { AuthErrorKey } from "#auth/errors.ts";
import { FormField } from "#components/auth/form-field.tsx";

/** The key an authenticator app is given, from the URI its QR code holds. */
export const keyOf = (totpURI: string): string =>
  new URL(totpURI).searchParams.get("secret") ?? "";

/** The recovery codes as a text file holds them: one a line. */
export const recoveryFileOf = (codes: readonly string[]): string =>
  `${codes.join("\n")}\n`;

const ErrorLine = ({ error }: { readonly error: AuthErrorKey | null }) => {
  const errors = useTranslations("Auth.errors");

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>{errors(error)}</AlertDescription>
    </Alert>
  );
};

/** Off: what it is, and the way to turn it on, once the address is confirmed. */
export const TwoStepOffView = ({
  emailVerified,
  onTurnOn,
}: {
  readonly emailVerified: boolean;
  readonly onTurnOn: () => void;
}) => {
  const t = useTranslations("TwoStep");

  return (
    <div className="flex flex-col gap-4">
      <p>
        <Badge variant="outline">{t("off")}</Badge>
      </p>
      {emailVerified ? (
        <div>
          <Button onClick={onTurnOn}>{t("turnOn")}</Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{t("verifyEmailFirst")}</p>
      )}
    </div>
  );
};

/**
 * The password, which confirms who asks before the key, new codes or
 * turning it off.
 */
export const TwoStepPasswordView = ({
  action,
  description,
  error,
  onCancel,
  onPassword,
  onSubmit,
  password,
  pending,
}: {
  readonly action: string;
  readonly description?: string;
  readonly error: AuthErrorKey | null;
  readonly onCancel: () => void;
  readonly onPassword: (password: string) => void;
  readonly onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly password: string;
  readonly pending: boolean;
}) => {
  const t = useTranslations("TwoStep");

  return (
    <form onSubmit={onSubmit} className="flex max-w-sm flex-col gap-4">
      {description === undefined ? null : (
        <p className="text-muted-foreground text-sm">{description}</p>
      )}
      <ErrorLine error={error} />
      <FormField
        id="two-step-password"
        type="password"
        autoComplete="current-password"
        label={t("password")}
        hint={t("passwordHint")}
        value={password}
        onChange={onPassword}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} focusableWhenDisabled>
          {pending ? t("pending") : action}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
};

/**
 * The key to give the authenticator app, as a QR code drawn here and as
 * text, and the first code it shows, which turns two-step verification on.
 */
export const TwoStepSetupView = ({
  code,
  error,
  onCancel,
  onCode,
  onSubmit,
  pending,
  totpURI,
}: {
  readonly code: string;
  readonly error: AuthErrorKey | null;
  readonly onCancel: () => void;
  readonly onCode: (code: string) => void;
  readonly onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly pending: boolean;
  readonly totpURI: string;
}) => {
  const t = useTranslations("TwoStep");
  const codeId = useId();

  const handleCode = (event: ChangeEvent<HTMLInputElement>) => {
    onCode(event.target.value);
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="text-sm">{t("scan")}</p>
      <div className="flex flex-wrap items-center gap-6">
        <div className="rounded-md border p-3">
          <QRCodeSVG value={totpURI} size={176} title={t("qrLabel")} />
        </div>
        <dl className="flex flex-col gap-1 text-sm">
          <dt className="text-muted-foreground">{t("key")}</dt>
          <dd>
            <code className="font-mono break-all">{keyOf(totpURI)}</code>
          </dd>
        </dl>
      </div>
      <ErrorLine error={error} />
      <div className="flex max-w-sm flex-col gap-2">
        <Label htmlFor={codeId}>{t("enterCode")}</Label>
        <Input
          id={codeId}
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={handleCode}
          required
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} focusableWhenDisabled>
          {pending ? t("verifying") : t("verify")}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
};

/**
 * The recovery codes, shown once: to copy or download, and to confirm
 * they were saved before leaving.
 */
export const TwoStepCodesView = ({
  codes,
  extra,
  onCopy,
  onDone,
  onDownload,
  onSaved,
  saved,
}: {
  readonly codes: readonly string[];
  /** What else to say once it was turned on. */
  readonly extra?: ReactNode;
  readonly onCopy: () => void;
  readonly onDone: () => void;
  readonly onDownload: () => void;
  readonly onSaved: (saved: boolean) => void;
  readonly saved: boolean;
}) => {
  const t = useTranslations("TwoStep");
  const savedId = useId();

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">{t("recoveryTitle")}</h3>
      <p className="text-muted-foreground text-sm">{t("recoveryAbout")}</p>
      <ul className="grid max-w-sm grid-cols-2 gap-2 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onCopy}>
          {t("copy")}
        </Button>
        <Button type="button" variant="outline" onClick={onDownload}>
          {t("download")}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id={savedId} checked={saved} onCheckedChange={onSaved} />
        <Label htmlFor={savedId}>{t("recoverySaved")}</Label>
      </div>
      {extra}
      <div>
        <Button
          type="button"
          disabled={!saved}
          focusableWhenDisabled
          onClick={onDone}
        >
          {t("done")}
        </Button>
      </div>
    </div>
  );
};

/**
 * On: how many recovery codes are left, new ones, and turning it off,
 * which a workspace that requires it holds back.
 */
export const TwoStepOnView = ({
  onNewCodes,
  onTurnOff,
  recoveryCodesLeft,
  requiredBy,
}: {
  readonly onNewCodes: () => void;
  readonly onTurnOff: () => void;
  readonly recoveryCodesLeft: number | null;
  readonly requiredBy: readonly string[];
}) => {
  const t = useTranslations("TwoStep");

  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap items-center gap-2">
        <Badge>{t("on")}</Badge>
        {recoveryCodesLeft === null ? null : (
          <span className="text-muted-foreground text-sm">
            {t("recoveryLeft", { count: recoveryCodesLeft })}
          </span>
        )}
      </p>
      {requiredBy.length === 0 ? null : (
        <p className="text-muted-foreground text-sm">
          {t("requiredBy", { workspaces: requiredBy.join(", ") })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onNewCodes}>
          {t("recoveryNew")}
        </Button>
        {requiredBy.length === 0 ? (
          <Button type="button" variant="outline" onClick={onTurnOff}>
            {t("turnOff")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
