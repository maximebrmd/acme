"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import {
  maxWebhookBulkRedelivery,
  webhookBulkRedeliveriesPerHour,
  webhookDeliveryRetentionDays,
  webhookSecretOverlapHours,
} from "peal-contract";
import type {
  Channel,
  SubscribableWebhookEventType,
  WebhookDelivery,
  WebhookEndpoint,
} from "peal-contract";
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
import { Button } from "peal-ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "peal-ui/components/tabs";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { channelName } from "#channels/channel-name.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { workspaceChannels } from "#posts/api.ts";
import { browserTimeZone } from "#posts/zoned-time.ts";
import {
  anyDelivery,
  createWebhook,
  deleteWebhook,
  deliveriesChanged,
  deliveryPage,
  endpointsChanged,
  redeliverWebhook,
  redeliverWebhooks,
  rotateWebhookSecret,
  searchPage,
  sendWebhookTest,
  updateWebhook,
  workspaceWebhooks,
} from "#webhooks/atoms.ts";
import type { LogFilter } from "#webhooks/atoms.ts";
import {
  changeOf,
  draftOf,
  emptyDraft,
  newEndpointOf,
} from "#webhooks/endpoint-draft.ts";
import type { EndpointDraft } from "#webhooks/endpoint-draft.ts";
import { webhookErrorOf } from "#webhooks/errors.ts";
import type { WebhookError } from "#webhooks/errors.ts";
import { hostOf } from "#webhooks/host.ts";

import {
  DeliveryFilterView,
  DeliveryLogView,
  EndpointFieldsView,
  EndpointItemView,
  TestEventPicker,
  useWebhookErrorText,
  WebhookSecretView,
} from "./webhook-views.tsx";
import type { ChannelChoice } from "./webhook-views.tsx";

// The workspace's channels, as the endpoint form offers them; none while
// they load, or for a member who may not read them.
const useChannelChoices = (workspaceId: string): readonly ChannelChoice[] =>
  Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceChannels(workspaceId))),
    (): readonly Channel[] => []
  ).map((channel) => ({ id: channel.id, label: channelName(channel) }));

const failedOnly: LogFilter = {
  ...anyDelivery,
  status: Option.some("failed"),
};

/** A secret to show once, and whether it replaced another. */
interface ShownSecret {
  readonly rotated: boolean;
  readonly secret: string;
}

// Sends one delivery's event to its endpoint again, as a new delivery.
const SendAgain = ({
  delivery,
  endpointId,
  workspaceId,
}: {
  readonly delivery: WebhookDelivery;
  readonly endpointId: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const explain = useWebhookErrorText();
  const redeliver = useAtomSet(redeliverWebhook, { mode: "promiseExit" });
  const [isSending, startSending] = useTransition();

  const handleSend = () => {
    startSending(async () => {
      const exit = await redeliver({
        params: { deliveryId: delivery.id, endpointId, workspaceId },
        reactivityKeys: deliveriesChanged(endpointId),
      });

      Option.match(webhookErrorOf(exit), {
        onNone: () => {
          toast.success(t("sentAgain"));
        },
        onSome: (error) => {
          toast.error(explain(error));
        },
      });
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isSending}
      focusableWhenDisabled
      onClick={handleSend}
    >
      {isSending ? t("sendingAgain") : t("sendAgain")}
    </Button>
  );
};

// A page of an endpoint's deliveries, then the pages after it that "Show
// more" opened. Each page starts where the one before ends.
const DeliveryPages = ({
  cursor,
  endpointId,
  filter,
  mayManage,
  more,
  onMore,
  workspaceId,
}: {
  readonly cursor: Option.Option<string>;
  readonly endpointId: string;
  readonly filter: LogFilter;
  readonly mayManage: boolean;
  // How many pages to show after this one.
  readonly more: number;
  readonly onMore: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const page = deliveryPage(workspaceId, endpointId, cursor, filter);
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => {
      if (Option.isNone(cursor) && value.items.length === 0) {
        return (
          <p className="text-muted-foreground text-sm">
            {t("deliveriesEmpty", { days: webhookDeliveryRetentionDays })}
          </p>
        );
      }

      const next = Option.fromNullOr(value.nextCursor);

      return (
        <>
          {mayManage ? (
            <DeliveryLogView
              deliveries={value.items}
              actionFor={(delivery) => (
                <SendAgain
                  delivery={delivery}
                  endpointId={endpointId}
                  workspaceId={workspaceId}
                />
              )}
            />
          ) : (
            <DeliveryLogView deliveries={value.items} />
          )}
          {Option.isSome(next) && more > 0 ? (
            <DeliveryPages
              cursor={next}
              endpointId={endpointId}
              filter={filter}
              mayManage={mayManage}
              more={more - 1}
              workspaceId={workspaceId}
              onMore={onMore}
            />
          ) : null}
          {Option.isSome(next) && more === 0 ? (
            <Button variant="outline" className="self-center" onClick={onMore}>
              {t("loadMore")}
            </Button>
          ) : null}
        </>
      );
    },
  });
};

// Sends an endpoint's failed deliveries again, oldest first, once the
// member confirmed how many and the hour's budget.
const SendAllFailed = ({
  endpoint,
  workspaceId,
}: {
  readonly endpoint: WebhookEndpoint;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const settings = useTranslations("Settings");
  const explain = useWebhookErrorText();
  const redeliver = useAtomSet(redeliverWebhooks, { mode: "promiseExit" });
  const [isSending, startSending] = useTransition();

  // The first call's worth, to name how many it sends.
  const failed = Option.getOrUndefined(
    AsyncResult.value(
      useAtomValue(
        searchPage(
          workspaceId,
          Option.some(endpoint.id),
          Option.none(),
          failedOnly,
          maxWebhookBulkRedelivery
        )
      )
    )
  );

  const count = failed?.items.length ?? 0;

  const handleSend = () => {
    startSending(async () => {
      const exit = await redeliver({
        params: { workspaceId },
        payload: { endpointId: endpoint.id },
        reactivityKeys: deliveriesChanged(endpoint.id),
      });

      if (Exit.isSuccess(exit)) {
        toast.success(
          t("sentAllAgain", {
            remaining: exit.value.remaining,
            sent: exit.value.redelivered.length,
            skipped: exit.value.skipped.length,
          })
        );

        return;
      }

      Option.match(webhookErrorOf(exit), {
        onNone: () => {
          // A failure always has a reason.
        },
        onSome: (error) => {
          toast.error(explain(error));
        },
      });
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={isSending || count === 0}
            focusableWhenDisabled
          />
        }
      >
        {isSending ? t("sendingAllFailed") : t("sendAllFailed")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("sendAllFailedTitle", { host: hostOf(endpoint.url) })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("sendAllFailedDescription", {
              count,
              more: failed?.nextCursor === null ? "false" : "true",
              perHour: webhookBulkRedeliveriesPerHour,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleSend}>
            {t("sendAllFailed")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// An endpoint's delivery log, which changes as attempts are made: the
// member refreshes it to see how a delivery ended.
const DeliveryLog = ({
  endpoint,
  mayManage,
  workspaceId,
}: {
  readonly endpoint: WebhookEndpoint;
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const titleId = useId();
  const [more, setMore] = useState(0);
  const [filter, setFilter] = useState<LogFilter>(anyDelivery);

  const refresh = useAtomRefresh(
    deliveryPage(workspaceId, endpoint.id, Option.none(), filter)
  );

  const handleRefresh = () => {
    setMore(0);
    refresh();
  };

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="font-medium">
          {t("deliveriesTitle", { host: hostOf(endpoint.url) })}
        </h3>
        <span className="flex flex-wrap gap-2">
          {mayManage && endpoint.enabled ? (
            <SendAllFailed endpoint={endpoint} workspaceId={workspaceId} />
          ) : null}
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            {t("refresh")}
          </Button>
        </span>
      </div>
      <DeliveryFilterView
        filter={filter}
        idPrefix={endpoint.id}
        onChange={(next) => {
          setMore(0);
          setFilter(next);
        }}
      />
      <DeliveryPages
        cursor={Option.none()}
        endpointId={endpoint.id}
        filter={filter}
        mayManage={mayManage}
        more={more}
        workspaceId={workspaceId}
        onMore={() => {
          setMore((current) => current + 1);
        }}
      />
    </section>
  );
};

// An endpoint's form: its address, description and events, saved together.
const EditForm = ({
  endpoint,
  onClose,
  workspaceId,
}: {
  readonly endpoint: WebhookEndpoint;
  readonly onClose: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const settings = useTranslations("Settings");
  const update = useAtomSet(updateWebhook, { mode: "promiseExit" });
  const [draft, setDraft] = useState<EndpointDraft>(() => draftOf(endpoint));
  const [error, setError] = useState<WebhookError | null>(null);
  const [isPending, startTransition] = useTransition();
  const channels = useChannelChoices(workspaceId);
  const change = changeOf(draft);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(change)) {
      return;
    }

    startTransition(async () => {
      const exit = await update({
        params: { endpointId: endpoint.id, workspaceId },
        payload: change.value,
        reactivityKeys: endpointsChanged(workspaceId),
      });

      Option.match(webhookErrorOf(exit), {
        onNone: () => {
          toast.success(t("saved"));
          onClose();
        },
        onSome: setError,
      });
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <EndpointFieldsView
        channels={channels}
        draft={draft}
        error={error}
        disabled={isPending}
        idPrefix={endpoint.id}
        withEnabled={false}
        onChange={setDraft}
      />
      <div className="flex gap-2">
        <Button
          type="submit"
          disabled={isPending || Option.isNone(change)}
          focusableWhenDisabled
        >
          {isPending ? settings("saving") : t("save")}
        </Button>
        <Button variant="outline" disabled={isPending} onClick={onClose}>
          {settings("cancel")}
        </Button>
      </div>
    </form>
  );
};

// What a manager does to an endpoint: edit it, turn it off or on, try it,
// rotate its secret, and delete it, the last two once confirmed.
const EndpointActions = ({
  describedBy,
  endpoint,
  onEdit,
  onSecret,
  workspaceId,
}: {
  readonly describedBy: string;
  readonly endpoint: WebhookEndpoint;
  readonly onEdit: () => void;
  readonly onSecret: (shown: ShownSecret) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const settings = useTranslations("Settings");
  const explain = useWebhookErrorText();
  const update = useAtomSet(updateWebhook, { mode: "promiseExit" });
  const remove = useAtomSet(deleteWebhook, { mode: "promiseExit" });
  const rotate = useAtomSet(rotateWebhookSecret, { mode: "promiseExit" });
  const sendTest = useAtomSet(sendWebhookTest, { mode: "promiseExit" });
  const [isSwitching, startSwitching] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [isRotating, startRotating] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const [testType, setTestType] = useState<
    Option.Option<SubscribableWebhookEventType>
  >(Option.none());

  const testTypeId = useId();
  const params = { endpointId: endpoint.id, workspaceId };
  const host = hostOf(endpoint.url);

  const failed = (error: WebhookError) => {
    toast.error(explain(error));
  };

  const handleSwitch = () => {
    startSwitching(async () => {
      const exit = await update({
        params,
        payload: { enabled: !endpoint.enabled },
        reactivityKeys: endpointsChanged(workspaceId),
      });

      Option.match(webhookErrorOf(exit), {
        onNone: () => {
          toast.success(endpoint.enabled ? t("turnedOff") : t("turnedOn"));
        },
        onSome: failed,
      });
    });
  };

  const handleTest = () => {
    startTesting(async () => {
      const exit = await sendTest({
        params,
        query: Option.match(testType, {
          onNone: () => ({}),
          onSome: (eventType) => ({ eventType }),
        }),
        reactivityKeys: deliveriesChanged(endpoint.id),
      });

      Option.match(webhookErrorOf(exit), {
        onNone: () => {
          toast.success(
            Option.isSome(testType) ? t("sampleSent") : t("testSent")
          );
        },
        onSome: failed,
      });
    });
  };

  const handleRotate = () => {
    startRotating(async () => {
      const exit = await rotate({
        params,
        reactivityKeys: endpointsChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        onSecret({ rotated: true, secret: exit.value.secret });
      } else {
        Option.match(webhookErrorOf(exit), {
          onNone: () => {
            // A failure always has a reason.
          },
          onSome: failed,
        });
      }
    });
  };

  const handleDelete = () => {
    startDeleting(async () => {
      const exit = await remove({
        params,
        reactivityKeys: endpointsChanged(workspaceId),
      });

      Option.match(webhookErrorOf(exit), {
        onNone: () => {
          toast.success(t("deleted"));
        },
        onSome: failed,
      });
    });
  };

  const switching = endpoint.enabled ? t("turningOff") : t("turningOn");
  const switchTo = endpoint.enabled ? t("turnOff") : t("turnOn");

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        aria-describedby={describedBy}
        onClick={onEdit}
      >
        {t("edit")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={isSwitching}
        focusableWhenDisabled
        aria-describedby={describedBy}
        onClick={handleSwitch}
      >
        {isSwitching ? switching : switchTo}
      </Button>
      {endpoint.enabled ? (
        <span className="flex flex-wrap items-center gap-2">
          <TestEventPicker
            id={testTypeId}
            value={testType}
            onChange={setTestType}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isTesting}
            focusableWhenDisabled
            aria-describedby={describedBy}
            onClick={handleTest}
          >
            {isTesting ? t("sendingTest") : t("sendTest")}
          </Button>
        </span>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={isRotating}
              focusableWhenDisabled
              aria-describedby={describedBy}
            />
          }
        >
          {isRotating ? t("rotating") : t("rotate")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rotateTitle", { host })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("rotateDescription", { hours: webhookSecretOverlapHours })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRotate}>
              {t("rotate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              focusableWhenDisabled
              aria-describedby={describedBy}
            />
          }
        >
          {isDeleting ? t("deleting") : t("delete")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle", { host })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

type Panel = "deliveries" | "edit" | "none";

// One endpoint, with what the member opened under it: its form, or its
// deliveries.
const EndpointRow = ({
  endpoint,
  mayManage,
  onSecret,
  workspaceId,
}: {
  readonly endpoint: WebhookEndpoint;
  readonly mayManage: boolean;
  readonly onSecret: (shown: ShownSecret) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const urlId = useId();
  const [panel, setPanel] = useState<Panel>("none");

  const close = () => {
    setPanel("none");
  };

  return (
    <EndpointItemView
      endpoint={endpoint}
      urlId={urlId}
      actions={
        <>
          {mayManage ? (
            <EndpointActions
              describedBy={urlId}
              endpoint={endpoint}
              workspaceId={workspaceId}
              onSecret={onSecret}
              onEdit={() => {
                setPanel("edit");
              }}
            />
          ) : null}
          <Button
            variant="outline"
            size="sm"
            aria-describedby={urlId}
            aria-expanded={panel === "deliveries"}
            onClick={() => {
              setPanel(panel === "deliveries" ? "none" : "deliveries");
            }}
          >
            {panel === "deliveries" ? t("hideDeliveries") : t("showDeliveries")}
          </Button>
        </>
      }
    >
      {panel === "edit" ? (
        <EditForm
          endpoint={endpoint}
          workspaceId={workspaceId}
          onClose={close}
        />
      ) : null}
      {panel === "deliveries" ? (
        <DeliveryLog
          endpoint={endpoint}
          mayManage={mayManage}
          workspaceId={workspaceId}
        />
      ) : null}
    </EndpointItemView>
  );
};

const LoadedEndpoints = ({
  mayManage,
  onSecret,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly onSecret: (shown: ShownSecret) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const atom = workspaceWebhooks(workspaceId);
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
          {value.map((endpoint) => (
            <EndpointRow
              key={endpoint.id}
              endpoint={endpoint}
              mayManage={mayManage}
              workspaceId={workspaceId}
              onSecret={onSecret}
            />
          ))}
        </ul>
      ),
  });
};

// The workspace's failed deliveries across its endpoints, a page at a
// time, each named by its endpoint's host and sent again on its own.
const FailedPages = ({
  cursor,
  hosts,
  mayManage,
  more,
  onMore,
  workspaceId,
}: {
  readonly cursor: Option.Option<string>;
  readonly hosts: ReadonlyMap<string, string>;
  readonly mayManage: boolean;
  readonly more: number;
  readonly onMore: () => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const page = searchPage(workspaceId, Option.none(), cursor, failedOnly);
  const result = useAtomValue(page);
  const reload = useAtomRefresh(page);

  const endpointOf = (delivery: WebhookDelivery) =>
    hosts.get(delivery.endpointId) ?? delivery.endpointId;

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => {
      if (Option.isNone(cursor) && value.items.length === 0) {
        return (
          <p className="text-muted-foreground text-sm">
            {t("failedEmpty", { days: webhookDeliveryRetentionDays })}
          </p>
        );
      }

      const next = Option.fromNullOr(value.nextCursor);

      return (
        <>
          {mayManage ? (
            <DeliveryLogView
              deliveries={value.items}
              endpointOf={endpointOf}
              actionFor={(delivery) => (
                <SendAgain
                  delivery={delivery}
                  endpointId={delivery.endpointId}
                  workspaceId={workspaceId}
                />
              )}
            />
          ) : (
            <DeliveryLogView deliveries={value.items} endpointOf={endpointOf} />
          )}
          {Option.isSome(next) && more > 0 ? (
            <FailedPages
              cursor={next}
              hosts={hosts}
              mayManage={mayManage}
              more={more - 1}
              workspaceId={workspaceId}
              onMore={onMore}
            />
          ) : null}
          {Option.isSome(next) && more === 0 ? (
            <Button variant="outline" className="self-center" onClick={onMore}>
              {t("loadMore")}
            </Button>
          ) : null}
        </>
      );
    },
  });
};

const FailedDeliveries = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const [more, setMore] = useState(0);

  const endpoints = Option.getOrElse(
    AsyncResult.value(useAtomValue(workspaceWebhooks(workspaceId))),
    (): readonly WebhookEndpoint[] => []
  );

  const hosts = new Map(
    endpoints.map((endpoint) => [endpoint.id, hostOf(endpoint.url)])
  );

  const refresh = useAtomRefresh(
    searchPage(workspaceId, Option.none(), Option.none(), failedOnly)
  );

  return (
    <section
      aria-labelledby="failed-deliveries-title"
      className="flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="failed-deliveries-title" className="text-xl font-semibold">
          {t("failedTitle")}
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setMore(0);
            refresh();
          }}
        >
          {t("refresh")}
        </Button>
      </div>
      <FailedPages
        cursor={Option.none()}
        hosts={hosts}
        mayManage={mayManage}
        more={more}
        workspaceId={workspaceId}
        onMore={() => {
          setMore((current) => current + 1);
        }}
      />
    </section>
  );
};

// A new endpoint: its address, what it is for, its events, and whether it
// starts on.
const CreateForm = ({
  onSecret,
  workspaceId,
}: {
  readonly onSecret: (shown: ShownSecret) => void;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const create = useAtomSet(createWebhook, { mode: "promiseExit" });
  const [draft, setDraft] = useState<EndpointDraft>(emptyDraft);
  const [error, setError] = useState<WebhookError | null>(null);
  const [isPending, startTransition] = useTransition();
  const channels = useChannelChoices(workspaceId);
  const payload = newEndpointOf(draft);

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(payload)) {
      return;
    }

    startTransition(async () => {
      const exit = await create({
        params: { workspaceId },
        payload: payload.value,
        reactivityKeys: endpointsChanged(workspaceId),
      });

      if (Exit.isSuccess(exit)) {
        setError(null);
        setDraft(emptyDraft);
        onSecret({ rotated: false, secret: exit.value.secret });
      } else {
        setError(
          Option.getOrElse(webhookErrorOf(exit), (): WebhookError => ({
            key: "unknown",
          }))
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <EndpointFieldsView
        channels={channels}
        draft={draft}
        error={error}
        disabled={isPending}
        idPrefix="new"
        withEnabled
        onChange={setDraft}
      />
      <div>
        <Button
          type="submit"
          disabled={isPending || Option.isNone(payload)}
          focusableWhenDisabled
        >
          {isPending ? t("creating") : t("create")}
        </Button>
      </div>
    </form>
  );
};

/**
 * The workspace's webhook endpoints: the list, with each one's deliveries,
 * a form to add one for those who manage webhooks, and a signing secret
 * once, right after it was made.
 */
export const WebhooksSettings = ({
  mayManage,
  workspaceId,
}: {
  readonly mayManage: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Webhooks");
  const hydrated = useHydrated();
  const [shown, setShown] = useState<ShownSecret | null>(null);

  const handleCopy = (secret: string) => () => {
    void navigator.clipboard.writeText(secret).then(
      () => toast.success(t("copied")),
      () => toast.error(t("copyFailed"))
    );
  };

  return (
    <div className="flex flex-col gap-8">
      {shown === null ? null : (
        <WebhookSecretView
          rotated={shown.rotated}
          secret={shown.secret}
          onCopy={handleCopy(shown.secret)}
          onDone={() => {
            setShown(null);
          }}
        />
      )}
      <Tabs defaultValue="endpoints">
        <TabsList>
          <TabsTrigger value="endpoints">{t("tabEndpoints")}</TabsTrigger>
          <TabsTrigger value="failed">{t("tabFailed")}</TabsTrigger>
        </TabsList>
        <TabsContent value="endpoints">
          <section
            aria-labelledby="webhooks-title"
            className="flex flex-col gap-2"
          >
            <h2 id="webhooks-title" className="text-xl font-semibold">
              {t("listTitle")}
            </h2>
            {hydrated ? (
              <InTimeZone timeZone={browserTimeZone()}>
                <LoadedEndpoints
                  mayManage={mayManage}
                  workspaceId={workspaceId}
                  onSecret={setShown}
                />
              </InTimeZone>
            ) : (
              <SettingsLoading />
            )}
          </section>
        </TabsContent>
        <TabsContent value="failed">
          {hydrated ? (
            <InTimeZone timeZone={browserTimeZone()}>
              <FailedDeliveries
                mayManage={mayManage}
                workspaceId={workspaceId}
              />
            </InTimeZone>
          ) : (
            <SettingsLoading />
          )}
        </TabsContent>
      </Tabs>
      {mayManage ? (
        <section
          aria-labelledby="create-webhook-title"
          className="flex flex-col gap-4"
        >
          <h2 id="create-webhook-title" className="text-xl font-semibold">
            {t("createTitle")}
          </h2>
          <CreateForm workspaceId={workspaceId} onSecret={setShown} />
        </section>
      ) : null}
    </div>
  );
};
