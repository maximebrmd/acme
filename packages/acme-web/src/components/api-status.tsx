"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Badge } from "acme-ui/components/badge";
import { Button } from "acme-ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "acme-ui/components/card";
import { useTranslations } from "next-intl";

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
      <CardContent>
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {t(`detail.${status}`)}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          disabled={checking || onCheck === undefined}
          onClick={onCheck}
        >
          {checking ? t("retrying") : t("retry")}
        </Button>
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
