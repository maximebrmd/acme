import type { LivePostRefusal } from "peal-contract";

/** Why a channel could not be unpublished, as the user acts on it. */
export const livePostRefusalWords: Readonly<Record<LivePostRefusal, string>> = {
  alreadyRemoved: "Peal deleted it from the platform already",
  boostRunning:
    "a boost that is not over shows it: stop the boost first (peal ads boost stop)",
  changeInProgress:
    "it is being deleted already: peal posts changes says how that goes",
  channelUnavailable:
    "its channel is disconnected, turned off or must be reconnected",
  noPlatformId:
    "Peal has no id for it on the platform, as for a post confirmed by hand: delete it there",
  notPublished: "it is not live there",
  notSupported:
    "the platform does not let Peal delete posts (peal channels capabilities says why): delete it there",
};
