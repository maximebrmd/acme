<?php

namespace Peal\Types;

enum FeedItemReason: string
{
    case Existing = "existing";
    case TooMany = "tooMany";
    case Empty = "empty";
    case ContentRejected = "contentRejected";
    case PlanLimit = "planLimit";
    case QueueFull = "queueFull";
    case NoChannels = "noChannels";
    case Duplicate = "duplicate";
    case QueueGone = "queueGone";
}
