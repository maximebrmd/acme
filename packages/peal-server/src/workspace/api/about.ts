import {
  complaintRight,
  dataRights,
  processingRegister,
  recipientCategories,
} from "peal-contract";
import type {
  AccountExport,
  ProcessingCondition,
  ProcessingLocale,
} from "peal-contract";

import type { OperatorDeclaration } from "#workspace/domain/operator-declaration.ts";

/** What decides the information an export carries. */
export interface AboutInput {
  /** Whether the server bills: billing's records exist only then. */
  readonly bills: boolean;
  readonly declaration: OperatorDeclaration;
  /**
   * Whether the server keeps, or still holds, what French law has a host
   * keep about the user.
   */
  readonly legalRetention: boolean;
  /** The account's language. */
  readonly locale: ProcessingLocale;
}

/**
 * The information GDPR Article 15(1) lists, for the user's export: each
 * category of data the server processes, with its purposes, legal basis,
 * retention and source; who receives it; the rights and how to exercise
 * them; the right to complain. From the contract's registry, which the
 * privacy policy's retention table is written from too, in the account's
 * language, with what the operator declared and nothing it did not.
 */
export const aboutOf = ({
  bills,
  declaration,
  legalRetention,
  locale,
}: AboutInput): AccountExport["about"] => {
  const applies = (condition: ProcessingCondition): boolean =>
    condition === "always" ||
    (condition === "billing" && bills) ||
    (condition === "legalRetention" && legalRetention);

  return {
    categories: processingRegister
      .filter((category) => applies(category.applies))
      .map((category) => ({
        data: category.data[locale],
        id: category.id,
        legalBasis: category.legalBasis[locale],
        name: category.name[locale],
        purposes: category.purposes[locale],
        // What the operator runs itself, it may state itself.
        retention:
          (category.operatorSet
            ? declaration.retention[category.id]?.[locale]
            : undefined) ?? category.retention[locale],
        source: category.source[locale],
      })),
    complaint: {
      authority: declaration.supervisoryAuthority,
      right: complaintRight[locale],
    },
    controller: declaration.controller,
    language: locale,
    policyUrl: declaration.policyUrl,
    processors: declaration.recipients,
    recipients: recipientCategories
      .filter((category) => applies(category.applies))
      .map((category) => category.recipient[locale]),
    rights: dataRights.map((right) => ({
      article: right.article,
      how: right.how[locale],
      id: right.id,
      right: right.right[locale],
    })),
  };
};
