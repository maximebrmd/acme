import type { Money } from "peal-contract";
import {
  contractRequestTextPattern,
  maxContractRequestEmail,
  maxContractRequestText,
} from "peal-contract";

/** What the person wrote, or confirmed, in the function's rubrics. */
export interface FunctionValues {
  /** The contract's number, or the workspace's name; empty when not given. */
  readonly contract: string;
  /** The day wanted for a cancellation, as `2026-12-31`; empty for none. */
  readonly desiredOn: string;
  readonly email: string;
  readonly name: string;
  /** The workspace whose contract a signed-in member picked, or null. */
  readonly workspaceId: string | null;
}

/** A rubric whose value the server would refuse. */
export type InvalidField = "contract" | "email" | "name";

/** A workspace whose billing the signed-in member manages. */
export interface OwnContract {
  readonly id: string;
  readonly name: string;
}

/** Where the person is: the rubrics, the summary, then what was done. */
export type FunctionStep =
  | { readonly _tag: "form" }
  | { readonly _tag: "summary"; readonly refund: Money | null }
  | { readonly _tag: "received"; readonly receivedAt: Date }
  | { readonly _tag: "cancelled"; readonly endsAt: Date }
  | { readonly _tag: "withdrawn"; readonly refunded: Money };

/** Why the last try failed. */
export type FunctionError =
  | "captcha"
  | "forbidden"
  | "generic"
  | "notEnabled"
  | "nothingToCancel"
  | "tooMany"
  | "unavailable"
  | "withdrawalBusiness"
  | "withdrawalExpired"
  | "withdrawalNotSubscribed";

export type { ContractRequestKind as FunctionKind } from "peal-contract";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

const writable = (text: string): boolean =>
  text.length <= maxContractRequestText &&
  contractRequestTextPattern.test(text);

/**
 * The rubrics the server would refuse, by the contract's own rules, so the
 * person hears before the summary. A member who picked one of their
 * contracts names it by that choice.
 */
export const invalidFields = (
  values: FunctionValues
): readonly InvalidField[] => {
  const name = values.name.trim();
  const email = values.email.trim();
  const contract = values.contract.trim();
  const invalid: InvalidField[] = [];

  if (name === "" || !writable(name)) {
    invalid.push("name");
  }

  if (email.length > maxContractRequestEmail || !emailPattern.test(email)) {
    invalid.push("email");
  }

  if (values.workspaceId === null && contract !== "" && !writable(contract)) {
    invalid.push("contract");
  }

  return invalid;
};
