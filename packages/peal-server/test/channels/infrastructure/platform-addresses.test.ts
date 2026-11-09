import { describe, expect, it } from "@effect/vitest";
import { HttpApi } from "effect/http-api";
import { Api, MetaAppSchema } from "peal-contract";

import {
  describeRegistrations,
  platformRegistrations,
} from "#channels/infrastructure/platforms/platform-addresses.ts";

const publicUrl = "https://peal.example";
const registrations = platformRegistrations(publicUrl);

const addressesOf = (id: string) =>
  registrations
    .filter((registration) => registration.id === id)
    .flatMap((registration) => registration.addresses)
    .map(({ url }) => url);

// The routes of the contract that the platforms' own servers call, without
// signing in: Meta's signed requests, for each of its apps, and the
// documents Bluesky's servers read.
const routesPlatformsCall = () => {
  const urls: string[] = [];

  HttpApi.reflect(Api, {
    onEndpoint: ({ endpoint, group }) => {
      if (group.identifier === "channelOAuth") {
        urls.push(new URL(endpoint.path, publicUrl).href);
      }

      if (group.identifier === "dataDeletion" && endpoint.method === "POST") {
        for (const app of MetaAppSchema.literals) {
          urls.push(
            new URL(endpoint.path.replace(":app", app), publicUrl).href
          );
        }
      }
    },
    onGroup: () => {
      // Only endpoints matter.
    },
  });

  return urls;
};

describe("the addresses to register with each platform", () => {
  it("are those of the server's public origin", () => {
    const urls = registrations.flatMap(({ addresses }) =>
      addresses.map(({ url }) => url)
    );

    expect(urls.length).toBeGreaterThan(0);

    for (const url of urls) {
      expect(new URL(url).origin).toBe(publicUrl);
    }
  });

  it("follow the origin given, whatever its path or trailing slash", () => {
    expect(
      platformRegistrations("https://sandbox.peal.example/").flatMap(
        ({ addresses }) => addresses.map(({ url }) => url)
      )
    ).toStrictEqual(
      registrations.flatMap(({ addresses }) =>
        addresses.map(({ url }) =>
          url.replace(publicUrl, "https://sandbox.peal.example")
        )
      )
    );
  });

  it("send each sign-in back to the web app's callback page", () => {
    expect(addressesOf("linkedin")).toStrictEqual([
      "https://peal.example/connect/linkedin/callback",
    ]);
    expect(addressesOf("x")).toStrictEqual([
      "https://peal.example/connect/x/callback",
    ]);
    expect(addressesOf("tiktok")).toStrictEqual([
      "https://peal.example/connect/tiktok/callback",
    ]);
    expect(addressesOf("youtube")).toStrictEqual([
      "https://peal.example/connect/youtube/callback",
    ]);
    expect(addressesOf("mastodon")).toStrictEqual([
      "https://peal.example/connect/mastodon/callback",
    ]);
  });

  it("give each of Meta's use cases its redirects and its two callbacks", () => {
    expect(addressesOf("facebookLogin")).toStrictEqual([
      "https://peal.example/connect/facebook/callback",
      "https://peal.example/connect/instagram/callback",
      "https://peal.example/api/data-deletion/facebook",
      "https://peal.example/api/data-deletion/facebook/deauthorize",
    ]);
    expect(addressesOf("instagramLogin")).toStrictEqual([
      "https://peal.example/connect/instagram/callback",
      "https://peal.example/api/data-deletion/instagram",
      "https://peal.example/api/data-deletion/instagram/deauthorize",
    ]);
    expect(addressesOf("threads")).toStrictEqual([
      "https://peal.example/connect/threads/callback",
      "https://peal.example/api/data-deletion/threads",
      "https://peal.example/api/data-deletion/threads/deauthorize",
    ]);
  });

  it("list the documents Bluesky's servers read, which nobody registers", () => {
    expect(addressesOf("bluesky")).toStrictEqual([
      "https://peal.example/api/channels/oauth/bluesky/client-metadata.json",
      "https://peal.example/api/channels/oauth/bluesky/jwks.json",
      "https://peal.example/connect/bluesky/callback",
    ]);

    for (const id of ["bluesky", "mastodon"]) {
      expect(
        registrations.find((registration) => registration.id === id)
          ?.registeredBy
      ).toBe("server");
    }
  });

  // A route a platform calls that is missing here is one no operator
  // registers, and one an environment behind a login never lets through.
  it("name every route of the contract the platforms call themselves, and no other", () => {
    const called = registrations.flatMap(({ addresses }) =>
      addresses.filter(({ calledBy }) => calledBy === "platform")
    );

    expect(called.map(({ url }) => url).toSorted()).toStrictEqual(
      routesPlatformsCall().toSorted()
    );
  });

  it("name the settings that hold each app's credentials", () => {
    expect(
      Object.fromEntries(
        registrations.map(({ id, settings }) => [id, settings])
      )
    ).toStrictEqual({
      bluesky: ["BLUESKY_CLIENT_KEYS"],
      facebookLogin: ["META_APP_ID", "META_APP_SECRET"],
      instagramLogin: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"],
      linkedin: ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
      mastodon: [],
      threads: ["THREADS_APP_ID", "THREADS_APP_SECRET"],
      tiktok: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"],
      x: ["X_CLIENT_ID", "X_CLIENT_SECRET"],
      youtube: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
    });
  });
});

describe("the addresses as the command prints them", () => {
  const printed = describeRegistrations(publicUrl, registrations);

  it("names the origin they are for", () => {
    expect(printed.split("\n")[0]).toBe(
      "Addresses to register with each platform, for PUBLIC_URL https://peal.example"
    );
  });

  it("shows every address, under its platform and beside its field", () => {
    for (const { addresses, name } of registrations) {
      expect(printed).toContain(`\n${name}\n`);

      for (const { field, url } of addresses) {
        expect(printed).toContain(field);
        expect(printed).toContain(url);
      }
    }
  });

  it("says which addresses the platform's own servers call", () => {
    const line = printed
      .split("\n")
      .find((text) =>
        text.includes("https://peal.example/api/data-deletion/threads ")
      );

    expect(line).toContain("the platform's servers call it");
  });

  it("holds nothing but printable text", () => {
    expect(printed).toMatch(/^[\n -~]+$/u);
  });
});
