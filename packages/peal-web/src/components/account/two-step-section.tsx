"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Option, Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { authErrorKey } from "#auth/errors.ts";
import type { AuthErrorKey } from "#auth/errors.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { useRouter } from "#i18n/navigation.ts";
import { twoStepStatus } from "#settings/atoms.ts";

import {
  recoveryFileOf,
  TwoStepCodesView,
  TwoStepOffView,
  TwoStepOnView,
  TwoStepPasswordView,
  TwoStepSetupView,
} from "./two-step-views.tsx";

// What turning it on answers: the key's URI and the recovery codes, which
// stay in this component's state alone, never sent anywhere else.
const decodeEnabled = Schema.decodeUnknownOption(
  Schema.Struct({
    backupCodes: Schema.Array(Schema.String),
    totpURI: Schema.String,
  })
);

const decodeCodes = Schema.decodeUnknownOption(
  Schema.Struct({ backupCodes: Schema.Array(Schema.String) })
);

type Purpose = "disable" | "enable" | "newCodes";

type Step =
  | {
      readonly _tag: "codes";
      readonly codes: readonly string[];
      readonly turnedOn: boolean;
    }
  | { readonly _tag: "idle" }
  | { readonly _tag: "password"; readonly purpose: Purpose }
  | {
      readonly _tag: "setup";
      readonly codes: readonly string[];
      readonly totpURI: string;
    };

const idle: Step = { _tag: "idle" };

// The account's two-step verification once its status is read: turning it
// on (password, key, first code, recovery codes), new recovery codes, and
// turning it off.
const TwoStepControls = ({
  emailVerified,
  enabled,
  onChanged,
  recoveryCodesLeft,
  requiredBy,
}: {
  readonly emailVerified: boolean;
  readonly enabled: boolean;
  readonly onChanged: () => void;
  readonly recoveryCodesLeft: number | null;
  readonly requiredBy: readonly string[];
}) => {
  const t = useTranslations("TwoStep");
  const [step, setStep] = useState<Step>(idle);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const reset = () => {
    setStep(idle);
    setPassword("");
    setCode("");
    setSaved(false);
    setError(null);
  };

  const ask = (purpose: Purpose) => () => {
    setError(null);
    setStep({ _tag: "password", purpose });
  };

  const handlePassword = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step._tag !== "password") {
      return;
    }

    const { purpose } = step;

    startTransition(async () => {
      if (purpose === "enable") {
        const result = await authClient.twoFactor.enable({ password });

        if (result.error !== null) {
          setError(authErrorKey(result.error));

          return;
        }

        Option.match(decodeEnabled(result.data), {
          onNone: () => {
            setError("UNKNOWN");
          },
          onSome: ({ backupCodes, totpURI }) => {
            setError(null);
            setPassword("");
            setStep({ _tag: "setup", codes: backupCodes, totpURI });
          },
        });

        return;
      }

      if (purpose === "newCodes") {
        const result = await authClient.twoFactor.generateBackupCodes({
          password,
        });

        if (result.error !== null) {
          setError(authErrorKey(result.error));

          return;
        }

        Option.match(decodeCodes(result.data), {
          onNone: () => {
            setError("UNKNOWN");
          },
          onSome: ({ backupCodes }) => {
            setError(null);
            setPassword("");
            setStep({ _tag: "codes", codes: backupCodes, turnedOn: false });
            onChanged();
          },
        });

        return;
      }

      const result = await authClient.twoFactor.disable({ password });

      if (result.error === null) {
        reset();
        toast.success(t("turnedOff"));
        onChanged();
      } else {
        setError(authErrorKey(result.error));
      }
    });
  };

  const handleCode = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (step._tag !== "setup") {
      return;
    }

    const { codes } = step;

    startTransition(async () => {
      const result = await authClient.twoFactor.verifyTotp({
        code: code.trim(),
      });

      if (result.error === null) {
        setError(null);
        setCode("");
        setStep({ _tag: "codes", codes, turnedOn: true });
        onChanged();
      } else {
        setError(authErrorKey(result.error));
      }
    });
  };

  const codesOf = step._tag === "codes" ? step.codes : [];

  const handleCopy = () => {
    startTransition(async () => {
      await navigator.clipboard.writeText(codesOf.join("\n"));
      toast.success(t("copied"));
    });
  };

  // A text file made here, from the codes in memory.
  const handleDownload = () => {
    const url = URL.createObjectURL(
      new Blob([recoveryFileOf(codesOf)], { type: "text/plain" })
    );

    const link = document.createElement("a");

    link.href = url;
    link.download = t("downloadName");
    link.click();
    URL.revokeObjectURL(url);
  };

  if (step._tag === "password") {
    const actions: Readonly<Record<Purpose, string>> = {
      disable: t("turnOff"),
      enable: t("continue"),
      newCodes: t("recoveryNew"),
    };

    const descriptions: Readonly<Record<Purpose, string | undefined>> = {
      disable: t("turnOffAbout"),
      enable: undefined,
      newCodes: t("newCodesAbout"),
    };

    const description = descriptions[step.purpose];

    return (
      <TwoStepPasswordView
        action={actions[step.purpose]}
        {...(description === undefined ? {} : { description })}
        error={error}
        password={password}
        pending={isPending}
        onCancel={reset}
        onPassword={setPassword}
        onSubmit={handlePassword}
      />
    );
  }

  if (step._tag === "setup") {
    return (
      <TwoStepSetupView
        code={code}
        error={error}
        pending={isPending}
        totpURI={step.totpURI}
        onCancel={reset}
        onCode={setCode}
        onSubmit={handleCode}
      />
    );
  }

  if (step._tag === "codes") {
    return (
      <TwoStepCodesView
        codes={step.codes}
        extra={
          step.turnedOn ? (
            <p className="text-muted-foreground text-sm">
              {t("otherSessions")}
            </p>
          ) : null
        }
        saved={saved}
        onCopy={handleCopy}
        onDone={reset}
        onDownload={handleDownload}
        onSaved={setSaved}
      />
    );
  }

  return enabled ? (
    <TwoStepOnView
      recoveryCodesLeft={recoveryCodesLeft}
      requiredBy={requiredBy}
      onNewCodes={ask("newCodes")}
      onTurnOff={ask("disable")}
    />
  ) : (
    <TwoStepOffView emailVerified={emailVerified} onTurnOn={ask("enable")} />
  );
};

const LoadedTwoStep = ({
  emailVerified,
}: {
  readonly emailVerified: boolean;
}) => {
  const result = useAtomValue(twoStepStatus);
  const reload = useAtomRefresh(twoStepStatus);
  const router = useRouter();

  // The status, and the pages that read the account's flag.
  const changed = () => {
    reload();
    router.refresh();
  };

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => (
      <TwoStepControls
        emailVerified={emailVerified}
        enabled={value.enabled}
        recoveryCodesLeft={value.recoveryCodesLeft}
        requiredBy={value.requiredBy.map(({ name }) => name)}
        onChanged={changed}
      />
    ),
  });
};

/**
 * The account's two-step verification, read with the visitor's session
 * once the page runs.
 */
export const TwoStepSection = ({
  emailVerified,
}: {
  readonly emailVerified: boolean;
}) =>
  useHydrated() ? (
    <LoadedTwoStep emailVerified={emailVerified} />
  ) : (
    <SettingsLoading />
  );
