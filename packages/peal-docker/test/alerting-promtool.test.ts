// The billing alerts as Prometheus evaluates them (promtool, in the
// production image), on made-up series: each fires the first time, a
// counter born at 1 or a gauge set once at the start included, and stays
// quiet otherwise. Skipped without Docker.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";

const read = (file: string) =>
  readFileSync(path.join(import.meta.dirname, "..", file), "utf-8");

const RulesSchema = Schema.Struct({
  groups: Schema.Array(
    Schema.Struct({
      rules: Schema.Array(
        Schema.Struct({
          data: Schema.Array(
            Schema.Struct({
              model: Schema.Struct({
                conditions: Schema.optionalKey(
                  Schema.Array(
                    Schema.Struct({
                      evaluator: Schema.Struct({
                        params: Schema.Array(Schema.Number),
                      }),
                    })
                  )
                ),
                expr: Schema.optionalKey(Schema.String),
              }),
              refId: Schema.String,
            })
          ),
          for: Schema.String,
          uid: Schema.String,
        })
      ),
    })
  ),
});

const provisioned = Schema.decodeUnknownSync(RulesSchema)(
  parse(read("config/production/grafana/alerting/rules.yaml"))
).groups.flatMap(({ rules }) => rules);

const ComposeSchema = Schema.Struct({
  services: Schema.Struct({
    prometheus: Schema.Struct({ image: Schema.String }),
  }),
});

const { image } = Schema.decodeUnknownSync(ComposeSchema)(
  parse(read("compose.production.yaml"))
).services.prometheus;

// The rule as a Prometheus alert: its query, over its threshold, for as
// long as Grafana waits.
const alertOf = (uid: string) => {
  const rule = provisioned.find((each) => each.uid === uid);
  const expr = rule?.data.find(({ refId }) => refId === "A")?.model.expr;

  const threshold = rule?.data.find(({ refId }) => refId === "B")?.model
    .conditions?.[0]?.evaluator.params[0];

  if (rule === undefined || expr === undefined || threshold === undefined) {
    throw new Error(`No rule ${uid}`);
  }

  return { alert: uid, expr: `(${expr}) > ${threshold}`, for: rule.for };
};

interface Case {
  readonly name: string;
  readonly uid: string;
  readonly interval: string;
  readonly series: Readonly<Record<string, string>>;
  readonly expected: readonly (readonly [string, boolean])[];
}

const cases: readonly Case[] = [
  {
    expected: [
      ["29m", false],
      ["31m", true],
    ],
    interval: "1m",
    name: "a refusal kept, from its first appearance",
    series: { peal_billing_usage_report_refused_kept: "_x30 1x30" },
    uid: "peal-usage-report-refused",
  },
  {
    expected: [["40m", false]],
    interval: "1m",
    name: "no refusal kept",
    series: { peal_billing_usage_report_refused_kept: "0x60" },
    uid: "peal-usage-report-refused",
  },
  {
    expected: [
      ["15m", false],
      ["25m", true],
    ],
    interval: "1m",
    name: "customers paused for ten minutes",
    series: { peal_billing_usage_report_paused: "0x10 1x20" },
    uid: "peal-usage-report-key-refused",
  },
  {
    expected: [
      ["29m", false],
      ["31m", true],
    ],
    interval: "1m",
    name: "a reporter that never ends a run after the start",
    series: { peal_billing_usage_report_ran_at: "0x60" },
    uid: "peal-usage-report-stopped",
  },
  {
    expected: [["45m", false]],
    interval: "1m",
    name: "a reporter that runs",
    series: { peal_billing_usage_report_ran_at: "0+60x60" },
    uid: "peal-usage-report-stopped",
  },
  {
    expected: [
      ["25h", false],
      ["27h20m", true],
    ],
    interval: "5m",
    name: "a day not started by 02:00 the next day, an hourly run after",
    series: { peal_billing_account_days_started_day: "0x400" },
    uid: "peal-account-days-unstarted",
  },
  {
    expected: [["30h", false]],
    interval: "5m",
    name: "a day started each day",
    // The next day's first second, from the 24th hour on.
    series: { peal_billing_account_days_started_day: "0x288 86400x120" },
    uid: "peal-account-days-unstarted",
  },
  {
    expected: [["39h20m", false]],
    interval: "5m",
    name: "a restart at 15:00, the day before set until the run at start",
    // Today from 24h, the day before for 40 minutes from 39h, today again.
    series: {
      peal_billing_account_days_started_day: "_x288 86400x180 0x8 86400x60",
    },
    uid: "peal-account-days-unstarted",
  },
  {
    expected: [
      ["31m", true],
      ["35m", true],
    ],
    interval: "1m",
    name: "refusals kept across a restart, read from the rows at the start",
    // Three kept, the server restarts at 30m and reads three again.
    series: { peal_billing_usage_report_refused_kept: "3x29 _ 3x30" },
    uid: "peal-usage-report-refused",
  },
  {
    expected: [["40m", true]],
    interval: "1m",
    name: "a threshold refused after a restart, the counter higher an hour before",
    // At 2, the server restarts at 30m, one refusal at 35m.
    series: { peal_billing_threshold_unset_total: "2x30 0x5 1x30" },
    uid: "peal-threshold-unset",
  },
  {
    expected: [
      ["35m", true],
      ["95m", false],
    ],
    interval: "1m",
    name: "a threshold refused, the counter born at 1",
    series: { peal_billing_threshold_unset_total: "_x30 1x90" },
    uid: "peal-threshold-unset",
  },
  {
    expected: [["35m", true]],
    interval: "1m",
    name: "a threshold refused, the counter set at 0 at the start",
    series: { peal_billing_threshold_unset_total: "0x30 1x30" },
    uid: "peal-threshold-unset",
  },
  {
    expected: [
      ["35m", true],
      ["95m", false],
    ],
    interval: "1m",
    name: "meter events Stripe could not count, the counter born at 2",
    series: { peal_billing_meter_errors_total: "_x30 2x90" },
    uid: "peal-meter-errors",
  },
  {
    expected: [["40m", true]],
    interval: "1m",
    name: "meter errors after a restart, the counter higher an hour before",
    series: { peal_billing_meter_errors_total: "5x30 0x5 1x30" },
    uid: "peal-meter-errors",
  },
  {
    expected: [
      ["35m", true],
      ["95m", false],
    ],
    interval: "1m",
    name: "a second subscription ended, the counter born at 1",
    series: { peal_billing_duplicate_subscriptions_total: "_x30 1x90" },
    uid: "peal-duplicate-subscription",
  },
];

const dockerRuns =
  spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

describe("the billing alerts in Prometheus", () => {
  it.skipIf(!dockerRuns)(
    "fire as their tests say",
    () => {
      const folder = mkdtempSync(path.join(tmpdir(), "peal-alerts-"));

      chmodSync(folder, 0o755);

      try {
        const uids = [...new Set(cases.map(({ uid }) => uid))];

        writeFileSync(
          path.join(folder, "rules.yml"),
          stringify({ groups: [{ name: "billing", rules: uids.map(alertOf) }] })
        );
        writeFileSync(
          path.join(folder, "tests.yml"),
          stringify({
            evaluation_interval: "1m",
            rule_files: ["rules.yml"],
            tests: cases.map(({ expected, interval, name, series, uid }) => ({
              alert_rule_test: expected.map(([at, fires]) => ({
                alertname: uid,
                eval_time: at,
                exp_alerts: fires ? [{ exp_labels: {} }] : [],
              })),
              input_series: Object.entries(series).map(([metric, values]) => ({
                series: metric,
                values,
              })),
              interval,
              name,
            })),
          }),
          { mode: 0o644 }
        );

        const ran = spawnSync(
          "docker",
          [
            "run",
            "--rm",
            "--volume",
            `${folder}:/w:ro`,
            "--workdir",
            "/w",
            "--entrypoint",
            "promtool",
            image,
            "test",
            "rules",
            "tests.yml",
          ],
          { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }
        );

        expect(ran.status, `${ran.stdout}${ran.stderr}`).toBe(0);
      } finally {
        rmSync(folder, { force: true, recursive: true });
      }
    },
    120_000
  );
});
