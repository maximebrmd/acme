"use client";

import { Button } from "acme-ui/components/button";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { FormField } from "#components/auth/form-field.tsx";
import { useRouter } from "#i18n/navigation.ts";
import { settingsErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";

import { SettingsError } from "./settings-error.tsx";

// Renames the workspace, through Better Auth's organization route, which
// checks organization:update.
export const RenameWorkspaceForm = ({
  name,
  workspaceId,
}: {
  readonly name: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.general");
  const settings = useTranslations("Settings");
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();
  const renamed = value.trim();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await authClient.organization.update({
        data: { name: renamed },
        organizationId: workspaceId,
      });

      if (result.error === null) {
        setError(null);
        toast.success(t("renamed", { name: renamed }));
        router.refresh();
      } else {
        setError(settingsErrorKey(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <SettingsError error={error} />
      <FormField
        id="workspace-name"
        type="text"
        autoComplete="organization"
        label={t("name")}
        value={value}
        onChange={setValue}
      />
      <div>
        <Button
          type="submit"
          disabled={isPending || renamed === "" || renamed === name}
          focusableWhenDisabled
        >
          {isPending ? settings("saving") : t("rename")}
        </Button>
      </div>
    </form>
  );
};
