"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import { Skeleton } from "peal-ui/components/skeleton";

import { platformCapabilities } from "#analytics/api.ts";
import { PlatformsView } from "#components/platforms/platforms-view.tsx";
import { platformRowsOf } from "#platforms/rows.ts";
import { workspaceChannels } from "#posts/api.ts";

/**
 * The Console's Platforms page: what this server says a post may hold on
 * each platform, beside the workspace's channels there.
 */
export const PlatformsScreen = ({
  workspaceId,
}: {
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Platforms");
  const capabilitiesQuery = platformCapabilities(workspaceId);
  const channelsQuery = workspaceChannels(workspaceId);
  const capabilities = useAtomValue(capabilitiesQuery);
  const channels = useAtomValue(channelsQuery);
  const retryCapabilities = useAtomRefresh(capabilitiesQuery);
  const retryChannels = useAtomRefresh(channelsQuery);

  const body = (() => {
    if (
      AsyncResult.isFailure(capabilities) ||
      AsyncResult.isFailure(channels)
    ) {
      return (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t("loadFailed")}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              retryCapabilities();
              retryChannels();
            }}
          >
            {t("retry")}
          </Button>
        </div>
      );
    }

    if (
      !AsyncResult.isSuccess(capabilities) ||
      !AsyncResult.isSuccess(channels)
    ) {
      return (
        <div aria-busy="true">
          <span className="sr-only">{t("loading")}</span>
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    return (
      <PlatformsView
        rows={platformRowsOf(capabilities.value, channels.value)}
      />
    );
  })();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>
      {body}
    </div>
  );
};
