"use client";

import { DateTime } from "effect";
import { useTranslations } from "next-intl";
import {
  maxWebhookAttempts,
  maxWebhookDescriptionLength,
  maxWebhookUrlLength,
  SubscribableWebhookEventTypeSchema,
  webhookFailingDays,
} from "peal-contract";
import type {
  SubscribableWebhookEventType,
  WebhookDelivery,
  WebhookEndpoint,
} from "peal-contract";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import { useId } from "react";
import type { ChangeEvent, ReactNode } from "react";

import {
  everyTypeChosen,
  withEveryType,
  withType,
} from "#webhooks/endpoint-draft.ts";
import type { EndpointDraft } from "#webhooks/endpoint-draft.ts";
import type { WebhookError } from "#webhooks/errors.ts";

// The webhooks page's views: what an endpoint, its secret, its form and its
// delivery log look like, whatever fetched them. The page's state lives in
// webhooks-settings.tsx.

/** Writes why a webhook action failed, in the reader's language. */
export const useWebhookErrorText = () => {
  const t = useTranslations("Webhooks.errors");

  return (error: WebhookError): string => {
    if (error.key === "tooMany") {
      return t("tooMany", { allowed: error.allowed });
    }

    if (error.key === "urlRefused") {
      return t("urlRefused", { reason: error.reason });
    }

    return t(error.key);
  };
};

/** Why the last action on a form failed, announced when it appears. */
export const WebhookErrorAlert = ({
  error,
}: {
  readonly error: WebhookError | null;
}) => {
  const explain = useWebhookErrorText();

  return error === null ? null : (
    <Alert variant="destructive">
      <AlertDescription>{explain(error)}</AlertDescription>
    </Alert>
  );
};

/**
 * An endpoint's signing secret, shown this once, right after it was created
 * or rotated, to copy before it goes.
 */
export const WebhookSecretView = ({
  onCopy,
  onDone,
  rotated,
  secret,
}: {
  readonly onCopy?: () => void;
  readonly onDone: () => void;
  readonly rotated: boolean;
  readonly secret: string;
}) => {
  const t = useTranslations("Webhooks");
  const secretId = useId();

  return (
    <Alert>
      <AlertTitle>
        {t("secretTitle", { rotated: rotated ? "true" : "false" })}
      </AlertTitle>
      <AlertDescription>
        <span className="flex flex-col gap-3">
          {t("secretDescription")}
          <Label htmlFor={secretId} className="sr-only">
            {t("secretLabel")}
          </Label>
          <Input
            id={secretId}
            readOnly
            value={secret}
            onFocus={(event) => {
              event.target.select();
            }}
          />
          <span className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCopy}>
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

// Why an endpoint is off, and since when.
const OffNotice = ({ endpoint }: { readonly endpoint: WebhookEndpoint }) => {
  const t = useTranslations("Webhooks");
  const { disabledAt, disabledReason } = endpoint;

  return endpoint.enabled || disabledAt === null ? null : (
    <span className="text-muted-foreground text-sm">
      {t("offBecause", {
        date: DateTime.toDate(disabledAt),
        days: webhookFailingDays,
        reason: disabledReason ?? "manual",
      })}
    </span>
  );
};

/**
 * One endpoint: its address, what it is for, whether it is on and why not,
 * and the events it is sent. `actions` are what the member may do to it,
 * and `children` what they opened under it: its form, or its deliveries.
 */
export const EndpointItemView = ({
  actions,
  children,
  endpoint,
  urlId,
}: {
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
  readonly endpoint: WebhookEndpoint;
  /** The id of the address, which the actions are described by. */
  readonly urlId?: string;
}) => {
  const t = useTranslations("Webhooks");
  const { failingSince, previousSecretExpiresAt } = endpoint;

  return (
    <li className="flex flex-col gap-3 py-4">
      <div className="flex flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <code id={urlId} className="font-mono text-sm break-all">
            {endpoint.url}
          </code>
          <Badge variant={endpoint.enabled ? "secondary" : "outline"}>
            {t("status", { enabled: endpoint.enabled ? "true" : "false" })}
          </Badge>
        </span>
        {endpoint.description === "" ? null : (
          <span className="text-sm">{endpoint.description}</span>
        )}
        <OffNotice endpoint={endpoint} />
        {endpoint.enabled && failingSince !== null ? (
          <span className="text-destructive text-sm">
            {t("failingSince", {
              date: DateTime.toDate(failingSince),
              days: webhookFailingDays,
            })}
          </span>
        ) : null}
        {previousSecretExpiresAt === null ? null : (
          <span className="text-muted-foreground text-sm">
            {t("previousSecret", {
              date: DateTime.toDate(previousSecretExpiresAt),
            })}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{t("eventsLabel")}</span>
        <ul className="text-muted-foreground flex flex-col gap-1 text-sm">
          {endpoint.eventTypes.map((type) => (
            <li key={type} className="flex flex-wrap items-baseline gap-2">
              {t(`events.${type}`)}
              <code className="font-mono text-xs">{type}</code>
            </li>
          ))}
        </ul>
      </div>
      {actions === undefined ? null : (
        <div className="flex flex-wrap gap-2">{actions}</div>
      )}
      {children}
    </li>
  );
};

// One event an endpoint may be sent, by what it means and its name in the
// API.
const EventChoice = ({
  checked,
  disabled,
  onChange,
  type,
}: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly type: SubscribableWebhookEventType;
}) => {
  const t = useTranslations("Webhooks");
  const id = useId();

  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
      <span className="flex flex-col items-start gap-0.5">
        <Label htmlFor={id}>{t(`events.${type}`)}</Label>
        <code className="text-muted-foreground font-mono text-xs">{type}</code>
      </span>
    </div>
  );
};

/**
 * The fields of an endpoint: its address, what it is for, the events it is
 * sent and, for a new one, whether it starts on, under why saving them
 * failed last.
 */
export const EndpointFieldsView = ({
  disabled,
  draft,
  error,
  idPrefix,
  onChange,
  withEnabled,
}: {
  readonly disabled: boolean;
  readonly draft: EndpointDraft;
  readonly error: WebhookError | null;
  /** Tells this form's fields from another's on the page. */
  readonly idPrefix: string;
  readonly onChange: (draft: EndpointDraft) => void;
  /** Whether the form also says if the endpoint is on. */
  readonly withEnabled: boolean;
}) => {
  const t = useTranslations("Webhooks");
  const urlId = `${idPrefix}-webhook-url`;
  const descriptionId = `${idPrefix}-webhook-description`;
  const allId = `${idPrefix}-webhook-all-events`;
  const enabledId = `${idPrefix}-webhook-enabled`;
  const eventsHintId = `${idPrefix}-webhook-events-hint`;

  const handleUrl = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...draft, url: event.target.value });
  };

  const handleDescription = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...draft, description: event.target.value });
  };

  return (
    <div className="flex flex-col gap-4">
      <WebhookErrorAlert error={error} />
      <div className="flex max-w-xl flex-col gap-2">
        <Label htmlFor={urlId}>{t("url")}</Label>
        <Input
          id={urlId}
          name={urlId}
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://"
          maxLength={maxWebhookUrlLength}
          value={draft.url}
          disabled={disabled}
          aria-describedby={`${urlId}-hint`}
          aria-invalid={error?.key === "urlRefused" ? true : undefined}
          required
          onChange={handleUrl}
        />
        <p id={`${urlId}-hint`} className="text-muted-foreground text-xs">
          {t("urlHint")}
        </p>
      </div>
      <div className="flex max-w-xl flex-col gap-2">
        <Label htmlFor={descriptionId}>{t("descriptionLabel")}</Label>
        <Input
          id={descriptionId}
          name={descriptionId}
          type="text"
          autoComplete="off"
          maxLength={maxWebhookDescriptionLength}
          value={draft.description}
          disabled={disabled}
          aria-describedby={`${descriptionId}-hint`}
          onChange={handleDescription}
        />
        <p
          id={`${descriptionId}-hint`}
          className="text-muted-foreground text-xs"
        >
          {t("descriptionHint", { max: maxWebhookDescriptionLength })}
        </p>
      </div>
      <fieldset className="flex flex-col gap-3" aria-describedby={eventsHintId}>
        <legend className="mb-2 font-medium">{t("eventsLegend")}</legend>
        <p id={eventsHintId} className="text-muted-foreground text-sm">
          {t("eventsHint")}
        </p>
        <div className="flex items-center gap-3">
          <Checkbox
            id={allId}
            checked={everyTypeChosen(draft)}
            disabled={disabled}
            onCheckedChange={(checked) => {
              onChange(withEveryType(draft, checked));
            }}
          />
          <Label htmlFor={allId}>{t("allEvents")}</Label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SubscribableWebhookEventTypeSchema.literals.map((type) => (
            <EventChoice
              key={type}
              type={type}
              checked={draft.eventTypes.has(type)}
              disabled={disabled}
              onChange={(checked) => {
                onChange(withType(draft, type, checked));
              }}
            />
          ))}
        </div>
      </fieldset>
      {withEnabled ? (
        <div className="flex items-center gap-3">
          <Checkbox
            id={enabledId}
            checked={draft.enabled}
            disabled={disabled}
            onCheckedChange={(enabled) => {
              onChange({ ...draft, enabled });
            }}
          />
          <Label htmlFor={enabledId}>{t("enabled")}</Label>
        </div>
      ) : null}
    </div>
  );
};

const statusVariants = {
  failed: "destructive",
  pending: "outline",
  succeeded: "secondary",
} as const;

// How the last attempt ended: the receiver's status, or why none came, how
// long it took, and the start of what it said when that was not a success.
const LastAnswer = ({ delivery }: { readonly delivery: WebhookDelivery }) => {
  const t = useTranslations("Webhooks");
  const { durationMs, error, responseExcerpt, responseStatus } = delivery;

  if (delivery.lastAttemptAt === null) {
    return (
      <span className="text-muted-foreground">
        {delivery.status === "failed" && delivery.failureReason !== null
          ? t("deliveryFailure", { reason: delivery.failureReason })
          : t("notAttempted")}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap gap-x-2">
        {responseStatus === null ? null : (
          <span>{t("answerStatus", { status: String(responseStatus) })}</span>
        )}
        {error === null ? null : <span>{t("attemptError", { error })}</span>}
        {durationMs === null ? null : (
          <span className="text-muted-foreground">
            {t("duration", { ms: durationMs })}
          </span>
        )}
      </span>
      {responseExcerpt === null ? null : (
        <code className="text-muted-foreground max-w-md font-mono text-xs break-all whitespace-normal">
          {responseExcerpt}
        </code>
      )}
    </span>
  );
};

// Where the delivery is, and what follows: its next attempt, or why it was
// given up.
const DeliveryStatus = ({
  delivery,
}: {
  readonly delivery: WebhookDelivery;
}) => {
  const t = useTranslations("Webhooks");
  const { failureReason, nextAttemptAt, status } = delivery;

  return (
    <span className="flex flex-col items-start gap-1">
      <Badge variant={statusVariants[status]}>
        {t("deliveryStatus", { status })}
      </Badge>
      {status === "pending" && nextAttemptAt !== null ? (
        <span className="text-muted-foreground text-xs">
          {t("nextAttempt", { date: DateTime.toDate(nextAttemptAt) })}
        </span>
      ) : null}
      {status === "failed" &&
      failureReason !== null &&
      delivery.lastAttemptAt !== null ? (
        <span className="text-muted-foreground text-xs">
          {t("deliveryFailure", { reason: failureReason })}
        </span>
      ) : null}
    </span>
  );
};

/**
 * An endpoint's deliveries, newest first: the event of each, where it is,
 * how the receiver last answered, and how many attempts were made.
 * `actionFor` is what the member may do with one, such as sending it again.
 */
export const DeliveryLogView = ({
  actionFor,
  deliveries,
}: {
  readonly actionFor?: (delivery: WebhookDelivery) => ReactNode;
  readonly deliveries: readonly WebhookDelivery[];
}) => {
  const t = useTranslations("Webhooks");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columnEvent")}</TableHead>
          <TableHead>{t("columnStatus")}</TableHead>
          <TableHead>{t("columnAnswer")}</TableHead>
          <TableHead>{t("columnAttempts")}</TableHead>
          <TableHead>{t("columnCreated")}</TableHead>
          {actionFor === undefined ? null : (
            <TableHead>
              <span className="sr-only">{t("columnActions")}</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {deliveries.map((delivery) => (
          <TableRow key={delivery.id}>
            <TableCell>
              <span className="flex flex-col gap-0.5">
                {t(`events.${delivery.eventType}`)}
                <code className="text-muted-foreground font-mono text-xs">
                  {delivery.eventType}
                </code>
              </span>
            </TableCell>
            <TableCell>
              <DeliveryStatus delivery={delivery} />
            </TableCell>
            <TableCell>
              <LastAnswer delivery={delivery} />
            </TableCell>
            <TableCell>
              {t("attempts", {
                made: delivery.attempts,
                max: maxWebhookAttempts,
              })}
            </TableCell>
            <TableCell>
              {t("createdAt", { date: DateTime.toDate(delivery.createdAt) })}
            </TableCell>
            {actionFor === undefined ? null : (
              <TableCell>{actionFor(delivery)}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
