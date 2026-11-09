"use client";

import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";
import type { SubmitEvent } from "react";

import { authClient } from "#auth/client.ts";
import { authErrorKey } from "#auth/errors.ts";
import type { AuthErrorKey } from "#auth/errors.ts";
import { FormError } from "#components/auth/form-error.tsx";
import { FormField } from "#components/auth/form-field.tsx";
import { useRouter } from "#i18n/navigation.ts";

// A workspace's slug: its name in lowercase ASCII words, and a random tail
// so two workspaces may share a name.
const slugOf = (name: string): string => {
  const words = name
    .normalize("NFKD")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");

  return `${words === "" ? "workspace" : words}-${crypto.randomUUID().slice(0, 8)}`;
};

// Creates a workspace the user owns, then shows it in the list.
export const CreateWorkspaceForm = () => {
  const t = useTranslations("AppPage");
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<AuthErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await authClient.organization.create({
        name,
        slug: slugOf(name),
      });

      if (result.error === null) {
        setError(null);
        setName("");
        router.refresh();
      } else {
        setError(authErrorKey(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormError error={error} />
      <FormField
        id="workspace-name"
        type="text"
        autoComplete="organization"
        label={t("workspaceName")}
        value={name}
        onChange={setName}
      />
      <Button type="submit" disabled={isPending} focusableWhenDisabled>
        {isPending ? t("creating") : t("create")}
      </Button>
    </form>
  );
};
