// The contact point files as the production image of Grafana provisions
// them, with synthetic credentials and no network: Telegram and Slack's
// starts with both receivers, Telegram's alone takes Slack's out again on
// the same data, and Grafana stops without Slack's webhook, which is why
// peal_runtime picks the file from the credentials and release.yml checks
// it. Skipped without Docker.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { Schema } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { parse } from "yaml";

const alerting = path.join(
  import.meta.dirname,
  "..",
  "config/production/grafana/alerting"
);

const ComposeSchema = Schema.Struct({
  services: Schema.Struct({ grafana: Schema.Struct({ image: Schema.String }) }),
});

const docker = (...args: readonly string[]) =>
  spawnSync("docker", args, {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const { image } = Schema.decodeUnknownSync(ComposeSchema)(
  parse(
    readFileSync(
      path.join(import.meta.dirname, "..", "compose.production.yaml"),
      "utf-8"
    )
  )
).services.grafana;

const ContactPointsSchema = Schema.Array(
  Schema.Struct({ name: Schema.String, uid: Schema.String })
);

const run = randomBytes(4).toString("hex");
const volume = `peal-grafana-test-${run}`;
const container = `peal-grafana-test-${run}`;

const synthetic = {
  GF_SECURITY_ADMIN_PASSWORD: "synthetic",
  PEAL_GRAFANA_ENVIRONMENT: "sandbox",
  TELEGRAM_BOT_TOKEN: "123:synthetic",
  TELEGRAM_CHAT_ID: "-100",
};

const webhook = {
  SLACK_ALERTS_WEBHOOK_URL: "http://127.0.0.1:9/services/synthetic",
};

// Grafana on the test's volume with one contact point file: the
// provisioned contact points once it answers, or undefined once it stops.
const boot = (
  file: string,
  environment: Readonly<Record<string, string>>
): readonly (typeof ContactPointsSchema.Type)[number][] | undefined => {
  docker("rm", "--force", container);

  const started = docker(
    "run",
    "--detach",
    "--name",
    container,
    "--network",
    "none",
    "--volume",
    `${volume}:/var/lib/grafana`,
    "--volume",
    `${path.join(alerting, file)}:/etc/grafana/provisioning/alerting/contact-points.yaml:ro`,
    ...Object.entries(environment).flatMap(([name, value]) => [
      "--env",
      `${name}=${value}`,
    ]),
    image
  );

  if (started.status !== 0) {
    throw new Error(started.stderr);
  }

  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (
      docker(
        "inspect",
        "--format",
        "{{.State.Running}}",
        container
      ).stdout.trim() !== "true"
    ) {
      return undefined;
    }

    const answered = docker(
      "exec",
      container,
      "curl",
      "--silent",
      "--fail",
      "--user",
      "admin:synthetic",
      "http://127.0.0.1:3000/api/v1/provisioning/contact-points"
    );

    if (answered.status === 0) {
      return Schema.decodeUnknownSync(
        Schema.fromJsonString(ContactPointsSchema)
      )(answered.stdout);
    }

    spawnSync("sleep", ["1"]);
  }

  throw new Error(docker("logs", "--tail", "20", container).stderr);
};

const dockerRuns =
  spawnSync("docker", ["info"], { stdio: "ignore" }).status === 0;

describe("Grafana's contact points in the production image", () => {
  afterAll(() => {
    docker("rm", "--force", container);
    docker("volume", "rm", "--force", volume);
  });

  it.skipIf(!dockerRuns)(
    "send to Telegram and Slack, then to Telegram alone again",
    () => {
      const both = boot("telegram-slack.yaml", { ...synthetic, ...webhook });

      expect(
        both?.map(({ name, uid }) => `${name}/${uid}`).toSorted()
      ).toStrictEqual([
        "Telegram and Slack/slack",
        "Telegram and Slack/telegram",
      ]);

      const telegram = boot("telegram.yaml", synthetic);

      expect(telegram?.map(({ name, uid }) => `${name}/${uid}`)).toStrictEqual([
        "Telegram/telegram",
      ]);
    },
    300_000
  );

  it.skipIf(!dockerRuns)(
    "stop Grafana without Slack's webhook",
    () => {
      docker("volume", "rm", "--force", volume);

      expect(boot("telegram-slack.yaml", synthetic)).toBeUndefined();
    },
    300_000
  );
});
