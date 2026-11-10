<?php

namespace Peal\Types;

enum FailureReason: string
{
    case ContentRejected = "contentRejected";
    case ChannelDisconnected = "channelDisconnected";
    case ChannelDisabled = "channelDisabled";
    case MediaRemoved = "mediaRemoved";
    case MediaRejected = "mediaRejected";
    case Missed = "missed";
    case NotPublished = "notPublished";
    case RateLimited = "rateLimited";
    case TokenExpired = "tokenExpired";
    case Unavailable = "unavailable";
    case AppNotAudited = "appNotAudited";
    case QuotaExceeded = "quotaExceeded";
    case AppBillingLimit = "appBillingLimit";
    case PlanLimit = "planLimit";
    case PartsNotSent = "partsNotSent";
}
