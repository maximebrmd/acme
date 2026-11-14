"use client";

import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { SocialChannel, ShortLink } from "peal-contract";
import { Badge } from "peal-ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "peal-ui/components/table";

import { channelName } from "#channels/channel-name.ts";
import { postShortLinks } from "#short-links/atoms.ts";

/** The links a post went out with, as a table: what it shows, no state. */
export const PostLinksView = ({
  channels,
  links,
}: {
  readonly channels: readonly SocialChannel[];
  readonly links: readonly ShortLink[];
}) => {
  const t = useTranslations("ShortLinks.post");

  const nameOf = (channelId: string) => {
    const channel = channels.find(({ id }) => id === channelId);

    return channel === undefined ? t("unknownChannel") : channelName(channel);
  };

  return links.length === 0 ? (
    <p className="text-muted-foreground text-sm">{t("empty")}</p>
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("link")}</TableHead>
          <TableHead>{t("channel")}</TableHead>
          <TableHead className="text-right">{t("clicks")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {links.map((link) => (
          <TableRow key={link.id}>
            <TableCell className="max-w-xs whitespace-normal">
              <span className="block break-all">{link.destination}</span>
              <span className="text-muted-foreground block text-xs break-all">
                {link.shortUrl}
              </span>
              {link.disabled ? (
                <Badge variant="outline">{t("off")}</Badge>
              ) : null}
            </TableCell>
            <TableCell>
              {nameOf(link.channelId)}
              {link.part === 0 ? null : (
                <span className="text-muted-foreground">
                  {" "}
                  {t("part", { number: link.part + 1 })}
                </span>
              )}
            </TableCell>
            <TableCell variant="numeric">{link.clicks}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * The short links a post went out with and their clicks over the last 30
 * days, for members who read analytics, on a post that asked for them.
 */
export const PostLinks = ({
  channels,
  postId,
  workspaceId,
}: {
  readonly channels: readonly SocialChannel[];
  readonly postId: string;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("ShortLinks.post");
  const links = useAtomValue(postShortLinks({ postId, workspaceId }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {AsyncResult.isSuccess(links) ? (
          <PostLinksView channels={channels} links={links.value.items} />
        ) : (
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {AsyncResult.isFailure(links) ? t("loadFailed") : t("loading")}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
