<?php

namespace Peal\Types;

enum InboxOutgoingMessageReason: string
{
    case ChannelUnavailable = "channelUnavailable";
    case ReconnectNeeded = "reconnectNeeded";
    case RateLimited = "rateLimited";
    case PlatformUnavailable = "platformUnavailable";
    case ConversationGone = "conversationGone";
    case Refused = "refused";
    case NotSent = "notSent";
    case NoResponse = "noResponse";
    case Interrupted = "interrupted";
    case AdapterFailure = "adapterFailure";
}
