"use client";

import { DateTime, Option } from "effect";
import { useTranslations } from "next-intl";
import {
  maxWebhookAttempts,
  maxWebhookDescriptionLength,
  maxWebhookFilterWorkspaces,
  maxWebhookHeaderNameLength,
  maxWebhookHeaders,
  maxWebhookHeaderValueLength,
  maxWebhookUrlLength,
  SubscribableWebhookEventTypeSchema,
  WebhookDeliveryStatusSchema,
  WebhookEventTypeSchema,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";
import { Textarea } from "peal-ui/components/textarea";
import { useId } from "react";
import type { ChangeEvent, ReactNode } from "react";

import type { LogFilter } from "#webhooks/atoms.ts";
import {
  everyTypeChosen,
  goneChannelIds,
  withChannel,
  withEveryType,
  headersNeedValues,
  withHeader,
  withNewHeader,
  withoutHeader,
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
        {endpoint.channelIds.length === 0 ? null : (
          <span className="text-muted-foreground text-sm">
            {t("channelsFilter", { count: endpoint.channelIds.length })}
          </span>
        )}
        {endpoint.workspaceIds.length === 0 ? null : (
          <span className="text-muted-foreground text-sm">
            {t("workspacesFilter", { count: endpoint.workspaceIds.length })}
          </span>
        )}
        {endpoint.headerNames.length === 0 ? null : (
          <span className="text-muted-foreground text-sm">
            {t("headersShown", { names: endpoint.headerNames.join(", ") })}
          </span>
        )}
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

/** A channel an endpoint may listen to, by the name members know it by. */
export interface ChannelChoice {
  readonly id: string;
  readonly label: string;
}

// The channels an endpoint listens to: none ticked for every channel.
const ChannelsFieldset = ({
  channels,
  disabled,
  draft,
  idPrefix,
  onChange,
}: {
  readonly channels: readonly ChannelChoice[];
  readonly disabled: boolean;
  readonly draft: EndpointDraft;
  readonly idPrefix: string;
  readonly onChange: (draft: EndpointDraft) => void;
}) => {
  const t = useTranslations("Webhooks");
  const hintId = `${idPrefix}-webhook-channels-hint`;
  const gone = goneChannelIds(draft, channels);

  const choice = (id: string, label: string) => (
    <div key={id} className="flex items-center gap-3">
      <Checkbox
        id={`${idPrefix}-webhook-channel-${id}`}
        checked={draft.channelIds.has(id)}
        disabled={disabled}
        onCheckedChange={(checked) => {
          onChange(withChannel(draft, id, checked));
        }}
      />
      <Label htmlFor={`${idPrefix}-webhook-channel-${id}`}>{label}</Label>
    </div>
  );

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={hintId}>
      <legend className="mb-2 font-medium">{t("channelsLegend")}</legend>
      <p id={hintId} className="text-muted-foreground text-sm">
        {t("channelsHint")}
      </p>
      {channels.length === 0 && gone.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("channelsNone")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {channels.map((channel) => choice(channel.id, channel.label))}
          {gone.map((id) => choice(id, t("channelGone", { id })))}
        </div>
      )}
      {gone.length > 0 ? (
        <p className="text-muted-foreground text-sm">{t("channelsGoneHint")}</p>
      ) : null}
    </fieldset>
  );
};

// The headers every delivery carries beside Peal's: a saved one by its
// name, its value shown as set and replaced only when typed again; a new
// one with its name and value. Values are typed like passwords. Once the
// address moves to another origin, every saved value is asked again.
const HeadersFieldset = ({
  disabled,
  draft,
  idPrefix,
  invalid,
  onChange,
}: {
  readonly disabled: boolean;
  readonly draft: EndpointDraft;
  readonly idPrefix: string;
  readonly invalid: boolean;
  readonly onChange: (draft: EndpointDraft) => void;
}) => {
  const t = useTranslations("Webhooks");
  const hintId = `${idPrefix}-webhook-headers-hint`;
  const movedId = `${idPrefix}-webhook-headers-moved`;
  const moving = headersNeedValues(draft);

  return (
    <fieldset
      className="flex flex-col gap-3"
      aria-describedby={moving ? `${hintId} ${movedId}` : hintId}
    >
      <legend className="mb-2 font-medium">{t("headersLegend")}</legend>
      <p id={hintId} className="text-muted-foreground text-sm">
        {t("headersHint", { max: maxWebhookHeaders })}
      </p>
      {moving ? (
        <p id={movedId} className="text-destructive text-sm">
          {t("headersMoved")}
        </p>
      ) : null}
      {draft.headers.map((row, index) => {
        const nameId = `${idPrefix}-webhook-header-${String(index)}-name`;
        const valueId = `${idPrefix}-webhook-header-${String(index)}-value`;

        return (
          <div
            key={row.saved ? `saved-${row.name}` : `new-${String(index)}`}
            className="flex max-w-xl flex-wrap items-end gap-2"
          >
            <div className="flex min-w-40 flex-1 flex-col gap-1">
              <Label htmlFor={nameId}>{t("headerName")}</Label>
              <Input
                id={nameId}
                name={nameId}
                type="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={maxWebhookHeaderNameLength}
                value={row.name}
                readOnly={row.saved}
                disabled={disabled}
                aria-invalid={invalid ? true : undefined}
                onChange={(event) => {
                  onChange(
                    withHeader(draft, index, { name: event.target.value })
                  );
                }}
              />
            </div>
            <div className="flex min-w-40 flex-1 flex-col gap-1">
              <Label htmlFor={valueId}>{t("headerValue")}</Label>
              <Input
                id={valueId}
                name={valueId}
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                maxLength={maxWebhookHeaderValueLength}
                value={row.value}
                placeholder={row.saved && !moving ? t("headerSet") : undefined}
                required={moving && row.saved}
                disabled={disabled}
                aria-invalid={
                  moving && row.saved && row.value === "" ? true : undefined
                }
                aria-describedby={
                  row.saved
                    ? `${valueId}-hint ${moving ? movedId : ""}`.trim()
                    : undefined
                }
                onChange={(event) => {
                  onChange(
                    withHeader(draft, index, { value: event.target.value })
                  );
                }}
              />
              {row.saved ? (
                <p
                  id={`${valueId}-hint`}
                  className="text-muted-foreground text-xs"
                >
                  {moving ? t("headerMovedHint") : t("headerSetHint")}
                </p>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              aria-label={
                row.name.trim() === ""
                  ? t("removeNewHeader")
                  : t("removeHeader", { name: row.name })
              }
              onClick={() => {
                onChange(withoutHeader(draft, index));
              }}
            >
              {t("removeHeaderButton")}
            </Button>
          </div>
        );
      })}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || draft.headers.length >= maxWebhookHeaders}
          onClick={() => {
            onChange(withNewHeader(draft));
          }}
        >
          {t("addHeader")}
        </Button>
      </div>
    </fieldset>
  );
};

/**
 * The fields of an endpoint: its address, what it is for, the events it is
 * sent, the channels it listens to, the workspaces a partner endpoint
 * listens to, the headers it carries and, for a new one, whether it starts
 * on, under why saving them failed last.
 */
export const EndpointFieldsView = ({
  channels,
  disabled,
  draft,
  error,
  idPrefix,
  onChange,
  withEnabled,
}: {
  /** The workspace's channels, to listen to some only. */
  readonly channels: readonly ChannelChoice[];
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
  const workspacesId = `${idPrefix}-webhook-workspaces`;

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
      <ChannelsFieldset
        channels={channels}
        disabled={disabled}
        draft={draft}
        idPrefix={idPrefix}
        onChange={onChange}
      />
      {draft.scope === "partner" ? (
        <div className="flex max-w-xl flex-col gap-2">
          <Label htmlFor={workspacesId}>{t("workspacesLabel")}</Label>
          <Textarea
            id={workspacesId}
            name={workspacesId}
            rows={4}
            value={draft.workspaceIds}
            disabled={disabled}
            aria-describedby={`${workspacesId}-hint`}
            aria-invalid={error?.key === "filterRefused" ? true : undefined}
            onChange={(event) => {
              onChange({ ...draft, workspaceIds: event.target.value });
            }}
          />
          <p
            id={`${workspacesId}-hint`}
            className="text-muted-foreground text-xs"
          >
            {t("workspacesHint", { max: maxWebhookFilterWorkspaces })}
          </p>
        </div>
      ) : null}
      <HeadersFieldset
        disabled={disabled}
        draft={draft}
        idPrefix={idPrefix}
        invalid={
          error?.key === "headersRefused" ||
          error?.key === "headerValuesRequired"
        }
        onChange={onChange}
      />
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
  endpointOf,
}: {
  readonly actionFor?: (delivery: WebhookDelivery) => ReactNode;
  readonly deliveries: readonly WebhookDelivery[];
  /** The endpoint each went to, in a log across endpoints. */
  readonly endpointOf?: (delivery: WebhookDelivery) => string;
}) => {
  const t = useTranslations("Webhooks");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {endpointOf === undefined ? null : (
            <TableHead>{t("columnEndpoint")}</TableHead>
          )}
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
            {endpointOf === undefined ? null : (
              <TableCell>
                <code className="font-mono text-xs break-all">
                  {endpointOf(delivery)}
                </code>
              </TableCell>
            )}
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

const anyValue = "any";

/** What a delivery log shows: a status and an event, or any. */
export const DeliveryFilterView = ({
  filter,
  idPrefix,
  onChange,
}: {
  readonly filter: LogFilter;
  readonly idPrefix: string;
  readonly onChange: (filter: LogFilter) => void;
}) => {
  const t = useTranslations("Webhooks");
  const statusId = `${idPrefix}-delivery-status`;
  const eventId = `${idPrefix}-delivery-event`;
  const status = Option.getOrUndefined(filter.status);
  const eventType = Option.getOrUndefined(filter.eventType);

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex flex-col gap-1">
        <Label htmlFor={statusId}>{t("statusFilter")}</Label>
        <Select
          value={status ?? anyValue}
          onValueChange={(value) => {
            onChange({
              ...filter,
              status: Option.fromUndefinedOr(
                WebhookDeliveryStatusSchema.literals.find(
                  (literal) => literal === value
                )
              ),
            });
          }}
        >
          <SelectTrigger id={statusId}>
            <SelectValue>
              {status === undefined
                ? t("anyStatus")
                : t("deliveryStatus", { status })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={anyValue}>{t("anyStatus")}</SelectItem>
            {WebhookDeliveryStatusSchema.literals.map((literal) => (
              <SelectItem key={literal} value={literal}>
                {t("deliveryStatus", { status: literal })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor={eventId}>{t("eventFilter")}</Label>
        <Select
          value={eventType ?? anyValue}
          onValueChange={(value) => {
            onChange({
              ...filter,
              eventType: Option.fromUndefinedOr(
                WebhookEventTypeSchema.literals.find(
                  (literal) => literal === value
                )
              ),
            });
          }}
        >
          <SelectTrigger id={eventId}>
            <SelectValue>
              {eventType === undefined
                ? t("anyEvent")
                : t(`events.${eventType}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={anyValue}>{t("anyEvent")}</SelectItem>
            {WebhookEventTypeSchema.literals.map((literal) => (
              <SelectItem key={literal} value={literal}>
                {t(`events.${literal}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

/** Which test event to send: the plain one, or a sample of a type. */
export const TestEventPicker = ({
  id,
  onChange,
  value,
}: {
  readonly id: string;
  readonly onChange: (
    value: Option.Option<SubscribableWebhookEventType>
  ) => void;
  readonly value: Option.Option<SubscribableWebhookEventType>;
}) => {
  const t = useTranslations("Webhooks");
  const chosen = Option.getOrUndefined(value);

  return (
    <span className="flex items-center gap-2">
      <Label htmlFor={id} className="sr-only">
        {t("testEventLabel")}
      </Label>
      <Select
        value={chosen ?? anyValue}
        onValueChange={(picked) => {
          onChange(
            Option.fromUndefinedOr(
              SubscribableWebhookEventTypeSchema.literals.find(
                (literal) => literal === picked
              )
            )
          );
        }}
      >
        <SelectTrigger id={id} size="sm">
          <SelectValue>
            {chosen === undefined ? t("testEventPlain") : t(`events.${chosen}`)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={anyValue}>{t("testEventPlain")}</SelectItem>
          {SubscribableWebhookEventTypeSchema.literals.map((literal) => (
            <SelectItem key={literal} value={literal}>
              {t(`events.${literal}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  );
};
