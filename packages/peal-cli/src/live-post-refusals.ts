import type { LivePostRefusal } from "peal-contract";

/**
 * Why a channel could not be unpublished, or edited, as the user acts on
 * it.
 */
export const livePostRefusalWords: Readonly<Record<LivePostRefusal, string>> = {
  alreadyRemoved: "Peal deleted it from the platform already",
  approvalRequired:
    "your posts need an approval, and an edit goes out at once: ask an approver to make it",
  boostRunning:
    "a boost that is not over shows it: stop the boost first (peal ads boost stop)",
  changeInProgress:
    "another change of it is pending: peal posts changes says how that goes",
  channelUnavailable:
    "its channel is disconnected, turned off or must be reconnected",
  noPlatformId:
    "Peal has no id for it, or for that part, on the platform, as for a post confirmed by hand: change it there",
  notPublished: "it is not live there",
  notSupported:
    "the platform does not let Peal make that change (peal channels capabilities says why): make it there",
};
