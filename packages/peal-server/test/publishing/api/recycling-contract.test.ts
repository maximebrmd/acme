import { describe, expect, it } from "@effect/vitest";
import {
  maxOccurrences,
  maxRecyclingInterval,
  maxRecyclingRulesPerWorkspace,
  maxRecyclingVariants,
  minOccurrences,
  NotRecyclableReasonSchema,
  RecyclingEndReasonSchema,
  RecyclingNoticeReasonSchema,
  recyclingComingShown,
} from "peal-contract";

import { RecyclingEndReasonSchema as NoticeReasons } from "#notifications/domain/notice-event.ts";
import { NotRecyclableReasonSchema as OwnNotRecyclable } from "#publishing/application/post-not-recyclable.ts";
import { comingShown } from "#publishing/application/recycling.ts";
import { RecyclingEndReasonSchema as OwnReasons } from "#publishing/domain/recycling-end-reason.ts";
import { maxRecyclingInterval as ownInterval } from "#publishing/domain/recycling-interval.ts";
import {
  maxOccurrences as ownMaxOccurrences,
  maxRecyclingRulesPerWorkspace as ownMaxRules,
  maxRecyclingVariants as ownMaxVariants,
  minOccurrences as ownMinOccurrences,
} from "#publishing/domain/recycling-rule.ts";

// The contract's copy of the rules' limits and reasons, which clients
// read, is the server's: written once each side, kept equal here.

describe("the contract's recycling rules", () => {
  it("have the server's limits", () => {
    expect({
      comingShown: recyclingComingShown,
      interval: maxRecyclingInterval,
      maxOccurrences,
      maxRules: maxRecyclingRulesPerWorkspace,
      maxVariants: maxRecyclingVariants,
      minOccurrences,
    }).toStrictEqual({
      comingShown,
      interval: ownInterval,
      maxOccurrences: ownMaxOccurrences,
      maxRules: ownMaxRules,
      maxVariants: ownMaxVariants,
      minOccurrences: ownMinOccurrences,
    });
  });

  it("end and refuse for the server's reasons, and tell the same", () => {
    expect(RecyclingEndReasonSchema.literals).toStrictEqual(
      OwnReasons.literals
    );
    expect(NotRecyclableReasonSchema.literals).toStrictEqual(
      OwnNotRecyclable.literals
    );
    expect(RecyclingNoticeReasonSchema.literals).toStrictEqual(
      NoticeReasons.literals
    );
  });
});
