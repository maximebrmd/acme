<?php

namespace Peal\Types;

enum InboxReplyReason: string
{
    case ChannelUnavailable = "channelUnavailable";
    case ReconnectNeeded = "reconnectNeeded";
    case RateLimited = "rateLimited";
    case PlatformUnavailable = "platformUnavailable";
    case CommentGone = "commentGone";
    case Refused = "refused";
    case NotSent = "notSent";
    case TooLong = "tooLong";
    case NoResponse = "noResponse";
    case Interrupted = "interrupted";
    case AdapterFailure = "adapterFailure";
}
