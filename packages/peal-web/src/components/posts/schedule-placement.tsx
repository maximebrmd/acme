"use client";

import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "peal-ui/components/tabs";

import { QueueChoice } from "#components/posts/queue-choice.tsx";
import type { Placement } from "#components/posts/queue-choice.tsx";
import { ScheduleFields } from "#components/posts/schedule-fields.tsx";
import type { ScheduleChoice } from "#components/posts/schedule-fields.tsx";
import { Link } from "#i18n/navigation.ts";

/**
 * When a post goes out, as the composer asks it: at a date and time the
 * member picks, or on the next free slot of a queue.
 */
export const SchedulePlacementFields = ({
  choice,
  disabled,
  onChoice,
  onPlacement,
  placement,
  workspaceId,
}: {
  readonly choice: ScheduleChoice;
  readonly disabled: boolean;
  readonly onChoice: (choice: ScheduleChoice) => void;
  readonly onPlacement: (placement: Placement) => void;
  readonly placement: Placement;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Posts.Composer");
  const queueId = placement._tag === "queue" ? placement.queueId : undefined;

  return (
    <Tabs
      value={placement._tag}
      onValueChange={(value) => {
        onPlacement(
          value === "queue"
            ? { _tag: "queue", queueId: queueId ?? "" }
            : { _tag: "time" }
        );
      }}
    >
      <TabsList aria-label={t("placementLabel")}>
        <TabsTrigger value="time" disabled={disabled}>
          {t("atTime")}
        </TabsTrigger>
        <TabsTrigger value="queue" disabled={disabled}>
          {t("addToQueue")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="time" className="mt-3">
        <ScheduleFields
          value={choice}
          disabled={disabled}
          onChange={onChoice}
        />
      </TabsContent>
      <TabsContent value="queue" className="mt-3">
        {placement._tag === "queue" ? (
          <QueueChoice
            disabled={disabled}
            queueId={queueId === "" ? undefined : queueId}
            workspaceId={workspaceId}
            settingsLink={
              <Button
                variant="link"
                size="sm"
                render={<Link href={`/app/${workspaceId}/settings/queues`} />}
                nativeButton={false}
              >
                {t("queueSettings")}
              </Button>
            }
            onChange={(picked) => {
              onPlacement({ _tag: "queue", queueId: picked });
            }}
          />
        ) : null}
      </TabsContent>
    </Tabs>
  );
};
