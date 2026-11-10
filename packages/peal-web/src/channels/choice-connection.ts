import type { ChannelConnection, Platform } from "peal-contract";

// The one way in that answers a choice of accounts, on the platforms that
// have several: LinkedIn's company pages (a profile is one account) and
// Instagram through Facebook Login (Instagram Login reaches one account).
const choices: Partial<Record<Platform, ChannelConnection>> = {
  instagram: "facebookLogin",
  linkedin: "linkedinPage",
};

/**
 * What signing in again for a new choice of accounts starts with: the way
 * in the choice came through, so a member choosing LinkedIn pages is not
 * sent to connect their profile, nor one choosing the Instagram accounts of
 * their Pages to Instagram Login. Nothing on a platform with one way in.
 */
export const choiceStart = (
  platform: Platform
): { readonly connection?: ChannelConnection } => {
  const connection = choices[platform];

  return connection === undefined ? {} : { connection };
};
