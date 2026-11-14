// The platform list belongs to the shared kernel, which publishing reads too.
export {
  ChannelPlatformSchema,
  isSitePlatform,
  isSocialPlatform,
  PlatformSchema,
  platforms,
  SitePlatformSchema,
} from "#shared/domain/platform.ts";

export type {
  ChannelPlatform,
  Platform,
  SitePlatform,
} from "#shared/domain/platform.ts";
