<?php

namespace Peal\Types;

enum AttemptResult: string
{
    case Published = "published";
    case Unconfirmed = "unconfirmed";
    case ContentRejected = "contentRejected";
    case ChannelDisconnected = "channelDisconnected";
    case ChannelDisabled = "channelDisabled";
    case MediaRemoved = "mediaRemoved";
    case MediaRejected = "mediaRejected";
    case RateLimited = "rateLimited";
    case TokenExpired = "tokenExpired";
    case Unavailable = "unavailable";
    case AppNotAudited = "appNotAudited";
    case QuotaExceeded = "quotaExceeded";
    case AppBillingLimit = "appBillingLimit";
    case PlanLimit = "planLimit";
    case PartsNotSent = "partsNotSent";
    case RepliesNotAllowed = "repliesNotAllowed";
    case PaymentMethodRequired = "paymentMethodRequired";
    case XCeilingReached = "xCeilingReached";
}
