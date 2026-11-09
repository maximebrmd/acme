<?php

namespace Peal\Types;

enum TikTokPrivacyLevel: string
{
    case PublicToEveryone = "PUBLIC_TO_EVERYONE";
    case MutualFollowFriends = "MUTUAL_FOLLOW_FRIENDS";
    case FollowerOfCreator = "FOLLOWER_OF_CREATOR";
    case SelfOnly = "SELF_ONLY";
}
