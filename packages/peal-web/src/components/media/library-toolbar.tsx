"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { maxMediaQueryLength, MediaKindSchema } from "peal-contract";
import type { MediaKind } from "peal-contract";
import { Input } from "peal-ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId } from "react";

import type { LibrarySearch } from "#media/library-search.ts";

const kinds = MediaKindSchema.literals;

const anyKind = "any";

const kindOf = (value: string | null): MediaKind | null =>
  kinds.find((kind) => kind === value) ?? null;

/**
 * The library's toolbar (DESIGN.md, "Lists"): a search of the files'
 * names and descriptions, then a filter by kind. It says what the person
 * chose; the list asks the API once they pause.
 */
export const LibraryToolbarView = ({
  onSearch,
  search,
}: {
  readonly onSearch: (search: LibrarySearch) => void;
  readonly search: LibrarySearch;
}) => {
  const t = useTranslations("Media.library");
  const searchId = useId();
  const kindId = useId();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-48 flex-1 items-center gap-2">
        <SearchIcon aria-hidden className="text-muted-foreground size-4" />
        <label htmlFor={searchId} className="sr-only">
          {t("search")}
        </label>
        <Input
          id={searchId}
          type="search"
          value={search.text}
          maxLength={maxMediaQueryLength}
          placeholder={t("searchPlaceholder")}
          onChange={(event) => {
            onSearch({ ...search, text: event.target.value });
          }}
        />
      </div>
      <span id={kindId} className="sr-only">
        {t("kindFilter")}
      </span>
      <Select
        value={search.kind ?? anyKind}
        onValueChange={(value) => {
          onSearch({ ...search, kind: kindOf(value) });
        }}
      >
        <SelectTrigger aria-labelledby={kindId}>
          <SelectValue>
            {search.kind === null
              ? t("anyKind")
              : t("kinds", { kind: search.kind })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={anyKind}>{t("anyKind")}</SelectItem>
          {kinds.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {t("kinds", { kind })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
