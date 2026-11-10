<?php

namespace Peal\Types;

enum PlatformCapabilitiesAnalyticsAccountNumbersItem: string
{
    case Followers = "followers";
    case Following = "following";
    case Posts = "posts";
    case Views = "views";
    case Reach = "reach";
}
