import type { useTranslations } from "next-intl";

type Translate = ReturnType<typeof useTranslations<"Review">>;

/** A failed review request, by its tag and what it says of a comment. */
export interface ReviewFailure {
  readonly _tag: string;
  readonly problem?: string;
}

/** What a failed review request means, as the reader acts on it. */
export const failureText = (t: Translate, failure: ReviewFailure): string => {
  if (failure._tag === "CommentInvalid" && failure.problem !== undefined) {
    return t("errors.comment", { problem: failure.problem });
  }

  return t("errors.failure", { failure: failure._tag });
};
