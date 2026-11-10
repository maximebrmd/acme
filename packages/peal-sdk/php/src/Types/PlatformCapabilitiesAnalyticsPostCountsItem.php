<?php

namespace Peal\Types;

enum PlatformCapabilitiesAnalyticsPostCountsItem: string
{
    case Likes = "likes";
    case Reposts = "reposts";
    case Replies = "replies";
    case Quotes = "quotes";
    case Impressions = "impressions";
    case Clicks = "clicks";
    case Reach = "reach";
    case Saves = "saves";
}
