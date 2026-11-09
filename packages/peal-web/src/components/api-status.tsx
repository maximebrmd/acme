"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { useTranslations } from "next-intl";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";

import { apiStatus, health } from "#api/health.ts";
import type { ApiStatus } from "#api/health.ts";

const badgeVariant = {
  healthy: "default",
  loading: "outline",
  unreachable: "destructive",
} as const satisfies Record<ApiStatus, string>;

interface ApiStatusViewProps {
  readonly status: ApiStatus;
  // A check is running; the last status stays on screen meanwhile.
  readonly checking?: boolean;
  readonly onCheck?: () => void;
}

export const ApiStatusView = ({
  status,
  checking = false,
  onCheck,
}: ApiStatusViewProps) => {
  const t = useTranslations("ApiStatus");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Badge variant={badgeVariant[status]}>{t(`status.${status}`)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent aria-busy={checking}>
        <p className="text-muted-foreground text-sm">{t(`detail.${status}`)}</p>
      </CardContent>
      <CardFooter>
        {/* The button stays focusable while it is disabled, so a keyboard
            user keeps their place, and the output below, a status region,
            announces that a check started and how it ended, even when the
            status is the same. */}
        <Button
          variant="outline"
          size="sm"
          disabled={checking || onCheck === undefined}
          focusableWhenDisabled
          onClick={onCheck}
        >
          {checking ? t("retrying") : t("retry")}
        </Button>
        <output className="sr-only">
          {checking ? t("retrying") : t(`detail.${status}`)}
        </output>
      </CardFooter>
    </Card>
  );
};

// The live status: hydrated from the server render, then checked again by the
// browser through /api, and on demand.
export const ApiStatusCard = () => {
  const result = useAtomValue(health);
  const handleCheck = useAtomRefresh(health);

  return (
    <ApiStatusView
      status={apiStatus(result)}
      checking={result.waiting}
      onCheck={handleCheck}
    />
  );
};
