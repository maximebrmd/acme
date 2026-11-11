import { Schema } from "effect";

// What a workspace answers a member whose account lacks the two-step
// verification it requires, once its owners turned the requirement on
// while a page of it was open.
const isTwoStepRefusal = Schema.is(
  Schema.Struct({
    reason: Schema.Literal("twoStepRequired"),
    status: Schema.Literal(403),
  })
);

const listeners = new Set<() => void>();

/**
 * Called on every answer of the API, with its status and body: a refusal
 * for want of two-step verification tells whoever listens, so the page
 * shows the notice in place of the workspace.
 */
export const noticeAnswer = (answer: {
  readonly reason?: string | undefined;
  readonly status: number;
}): void => {
  if (isTwoStepRefusal(answer)) {
    for (const listener of listeners) {
      listener();
    }
  }
};

/** Listens for such a refusal; answers a way to stop listening. */
export const onTwoStepRefusal = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
