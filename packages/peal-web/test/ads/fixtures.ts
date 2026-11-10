import { DateTime } from "effect";
import type { AdAccount } from "peal-contract";

export const at = (iso: string) => DateTime.makeUnsafe(iso);

/** A synthetic ad account in euros, allowed to spend. */
export const euroAccount: AdAccount = {
  access: "working",
  amountSpent: 12_000,
  connectedAt: at("2026-11-01T09:00:00Z"),
  connectionId: "00000000-0000-7000-8000-0000000000c1",
  currency: "EUR",
  externalId: "act_1001",
  id: "00000000-0000-7000-8000-0000000000a1",
  minorUnitDigits: 2,
  monthlyCeiling: 50_000,
  name: "Synthetic Bakery Ads",
  network: "meta",
  spendCap: 100_000,
  spendingEnabled: true,
  status: "active",
  syncedAt: at("2026-11-10T08:00:00Z"),
  timeZone: "Europe/Paris",
};

/** A synthetic ad account in yen, with spending off. */
export const yenAccount: AdAccount = {
  ...euroAccount,
  access: "reconnectNeeded",
  amountSpent: null,
  currency: "JPY",
  externalId: "act_1002",
  id: "00000000-0000-7000-8000-0000000000a2",
  minorUnitDigits: 0,
  monthlyCeiling: null,
  name: "Synthetic Studio Ads",
  spendCap: null,
  spendingEnabled: false,
  status: "unsettled",
  syncedAt: null,
  timeZone: "Asia/Tokyo",
};
