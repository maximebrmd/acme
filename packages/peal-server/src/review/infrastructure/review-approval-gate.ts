import { Effect, Layer } from "effect";
import { Digest } from "effect/crypto";

import { ApprovalGate } from "#publishing/application/approval-gate.ts";
import { ApprovalIntake } from "#review/application/approval-intake.ts";

const encoder = new TextEncoder();

/**
 * Publishing's approval gate, backed by the workspace's approval policy
 * and the approvals the review context records (ApprovalIntake). What a
 * post says reaches the review context as its SHA-256 only.
 */
export const ReviewApprovalGate = Layer.effect(
  ApprovalGate,
  Effect.gen(function* ReviewApprovalGate() {
    const digest = yield* Digest.Digest;
    const intake = yield* ApprovalIntake;

    // Hashing a string in memory does not fail.
    const hashOf = (subject: string) =>
      digest
        .digestHex(Digest.sha256, encoder.encode(subject))
        .pipe(Effect.orDie);

    return ApprovalGate.of({
      admit: (actor, { subject, ...submission }) =>
        hashOf(subject).pipe(
          Effect.flatMap((subjectHash) =>
            intake.consider(actor, { ...submission, subjectHash })
          )
        ),
      approved: ({ postId, subject, workspaceId }) =>
        hashOf(subject).pipe(
          Effect.flatMap((subjectHash) =>
            intake.approved(workspaceId, postId, subjectHash)
          )
        ),
      forgotten: intake.forgotten,
      maySubmit: intake.maySubmit,
      withdrawn: intake.withdrawn,
    });
  })
).pipe(Layer.provide(Digest.layerWebCrypto));
