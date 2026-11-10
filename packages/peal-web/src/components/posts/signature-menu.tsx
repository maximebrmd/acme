"use client";

import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { SignatureIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Channel, Signature } from "peal-contract";
import { Button } from "peal-ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "peal-ui/components/dropdown-menu";

import { workspaceSignatures } from "#signatures/atoms.ts";

interface SignatureMenuViewProps {
  /** The channels the post goes to, each of which can have its own text. */
  readonly channels: readonly Channel[];
  /** Whether the text can be changed now. */
  readonly disabled: boolean;
  /**
   * Puts a signature's text under the text for all channels, or under the
   * text of `channelId` alone.
   */
  readonly onInsert: (channelId: string | undefined, signature: string) => void;
  readonly signatures: readonly Signature[];
}

/**
 * The workspace's signatures, to put one under the post's text: under the
 * text for all channels, or under one channel's own.
 */
export const SignatureMenuView = ({
  channels,
  disabled,
  onInsert,
  signatures,
}: SignatureMenuViewProps) => {
  const t = useTranslations("Signatures");

  const items = (channelId: string | undefined) =>
    signatures.map((signature) => (
      <DropdownMenuItem
        key={signature.id}
        onClick={() => {
          onInsert(channelId, signature.text);
        }}
      >
        {signature.name}
      </DropdownMenuItem>
    ));

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              focusableWhenDisabled
            />
          }
        >
          <SignatureIcon data-icon="inline-start" aria-hidden />
          {t("menuTrigger")}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("menuAll")}</DropdownMenuLabel>
            {items(undefined)}
          </DropdownMenuGroup>
          {channels.length === 0 ? null : (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>{t("menuOwn")}</DropdownMenuLabel>
                {channels.map((channel) => (
                  <DropdownMenuSub key={channel.id}>
                    <DropdownMenuSubTrigger>
                      {channel.handle}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {items(channel.id)}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuGroup>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

/**
 * The composer's signatures menu. Nothing shows in a workspace without
 * signatures, or until they are known.
 */
export const SignatureMenu = ({
  workspaceId,
  ...view
}: Omit<SignatureMenuViewProps, "signatures"> & {
  readonly workspaceId: string;
}) => {
  const signatures = useAtomValue(workspaceSignatures(workspaceId));

  return AsyncResult.isSuccess(signatures) && signatures.value.length > 0 ? (
    <SignatureMenuView {...view} signatures={signatures.value} />
  ) : null;
};
