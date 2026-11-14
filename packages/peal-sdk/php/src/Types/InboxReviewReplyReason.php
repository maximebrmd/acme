<?php

namespace Peal\Types;

enum InboxReviewReplyReason: string
{
    case ChannelUnavailable = "channelUnavailable";
    case ReconnectNeeded = "reconnectNeeded";
    case RateLimited = "rateLimited";
    case PlatformUnavailable = "platformUnavailable";
    case ReviewGone = "reviewGone";
    case Refused = "refused";
    case NotSent = "notSent";
    case NoResponse = "noResponse";
    case Interrupted = "interrupted";
    case AdapterFailure = "adapterFailure";
}
