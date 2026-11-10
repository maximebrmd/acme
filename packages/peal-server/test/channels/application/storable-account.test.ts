import { describe, expect, it } from "@effect/vitest";
import { Option, Redacted } from "effect";

import {
  storableAccount,
  storableAuthorized,
} from "#channels/application/platform-authorizer.ts";
import type { AuthorizedAccount } from "#channels/application/platform-authorizer.ts";

// What a platform says of an account, as Peal keeps it.

const nul = String.fromCodePoint(0);
const lone = String.fromCodePoint(0xd8_00);
const override = String.fromCodePoint(0x20_2e);
const replaced = String.fromCodePoint(0xff_fd);

const account = (changed: Partial<AuthorizedAccount>): AuthorizedAccount => ({
  accountId: "109372",
  avatarUrl: Option.none(),
  displayName: Option.some("Studio"),
  handle: "@studio@social.example",
  tokens: {
    accessToken: Redacted.make("synthetic-token"),
    expiresAt: Option.none(),
    refreshToken: Option.none(),
    renewable: false,
    scopes: ["read"],
  },
  ...changed,
});

describe(storableAccount, () => {
  it("keeps an id, a handle and a name as one clean, bounded line each", () => {
    const cleaned = storableAccount(
      account({
        accountId: `109${nul}372`,
        displayName: Option.some(`Stu${nul}dio\n${override}${lone}`),
        handle: ` @studio${nul}@social.example\n${"h".repeat(1000)}`,
      })
    );

    expect(cleaned.accountId).toBe("109372");
    expect(cleaned.displayName).toStrictEqual(
      Option.some(`Studio ${replaced}`)
    );
    expect(cleaned.handle).toHaveLength(320);
    expect(cleaned.handle.startsWith("@studio@social.example h")).toBeTruthy();
  });

  it("keeps no name that cleans to nothing, and the tokens as they came", () => {
    const given = account({ displayName: Option.some(` ${nul}\n`) });
    const cleaned = storableAccount(given);

    expect(cleaned.displayName).toStrictEqual(Option.none());
    expect(cleaned.tokens).toBe(given.tokens);
  });

  it("cleans every account of a choice", () => {
    const authorized = storableAuthorized({
      _tag: "choice",
      accounts: [account({ handle: `page${nul}one` }), account({})],
    });

    expect(
      "_tag" in authorized
        ? authorized.accounts.map(({ handle }) => handle)
        : []
    ).toStrictEqual(["pageone", "@studio@social.example"]);
  });
});
