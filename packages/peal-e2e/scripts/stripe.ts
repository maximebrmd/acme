// A stand-in for Stripe's API, for the server the end-to-end tests run:
// billing is on there, so plans limit workspaces as on Peal Cloud, and the
// server checks Stripe's prices when it starts. It lists the prices Peal
// publishes, as the contract holds them, and answers anything else as an
// empty list or an object with a synthetic id: no test pays for anything.
// Nothing leaves the machine.
import { once } from "node:events";
import { createServer } from "node:http";
import type { Server } from "node:http";

import { Schema } from "effect";
import { billingCurrency, PaidPlanSchema, planCatalogue } from "peal-contract";

const intervals = [
  { key: "monthly", name: "month" },
  { key: "yearly", name: "year" },
] as const;

const prices = PaidPlanSchema.literals.flatMap((plan) =>
  intervals.map(({ key, name }) => ({
    active: true,
    currency: billingCurrency,
    id: `price_e2e_${plan}_${key}`,
    lookup_key: `peal_${plan}_${key}`,
    object: "price",
    recurring: { interval: name },
    tax_behavior: "exclusive",
    unit_amount: planCatalogue[plan].price?.[name] ?? 0,
  }))
);

const list = (data: readonly unknown[], url: string) => ({
  data,
  has_more: false,
  object: "list",
  url,
});

const PortSchema = Schema.Struct({ port: Schema.Int });

/** Starts the stand-in on a free loopback port, and says where it is. */
export const startStripe = async (): Promise<{
  readonly server: Server;
  readonly url: string;
}> => {
  const server = createServer((request, response) => {
    const { pathname } = new URL(request.url ?? "/", "http://127.0.0.1");

    const answer =
      request.method === "GET"
        ? list(pathname === "/v1/prices" ? prices : [], pathname)
        : { id: "e2e_synthetic", object: "synthetic" };

    request.resume();
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify(answer));
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const { port } = Schema.decodeUnknownSync(PortSchema)(server.address());

  return { server, url: `http://127.0.0.1:${port}` };
};
