import { describe, expect, it } from "@effect/vitest";

import {
  admitAttempt,
  forgetAttempts,
} from "#workspace/infrastructure/auth/password-attempts.ts";
import type { PasswordAttempts } from "#workspace/infrastructure/auth/password-attempts.ts";

const ana = "0b6e2f4a-3c1d-4e5f-8a9b-1c2d3e4f5a6b";

const ben = "1c7f3a5b-4d2e-4f60-9bac-2d3e4f5a6b7c";

// Tries `userId`'s password at each instant, in order: which were checked.
const tries = (
  start: PasswordAttempts,
  userId: string,
  instants: readonly number[]
) => {
  const admitted: boolean[] = [];
  let attempts = start;

  for (const now of instants) {
    const [allowed, kept] = admitAttempt(attempts, userId, now);

    admitted.push(allowed);
    attempts = kept;
  }

  return { admitted, attempts };
};

describe(admitAttempt, () => {
  it("checks three tries within 10 seconds, and the next once the first is 10 seconds old", () => {
    const { admitted } = tries(new Map(), ana, [0, 1000, 2000, 3000, 10_000]);

    expect(admitted).toStrictEqual([true, true, true, false, true]);
  });

  it("counts each account apart", () => {
    const { attempts } = tries(new Map(), ana, [0, 1, 2]);

    expect(admitAttempt(attempts, ben, 3)[0]).toBeTruthy();
    expect(admitAttempt(attempts, ana, 3)[0]).toBeFalsy();
  });

  it("keeps only the tries still within the window", () => {
    const { attempts } = tries(new Map([[ben, [0]]]), ana, [20_000]);

    expect([...attempts]).toStrictEqual([[ana, [20_000]]]);
  });
});

describe(forgetAttempts, () => {
  it("lets an account whose password matched try again at once", () => {
    const { attempts } = tries(new Map(), ana, [0, 1, 2]);

    expect(admitAttempt(forgetAttempts(attempts, ana), ana, 3)[0]).toBeTruthy();
  });
});
