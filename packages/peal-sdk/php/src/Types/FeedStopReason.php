<?php

namespace Peal\Types;

enum FeedStopReason: string
{
    case Unreachable = "unreachable";
    case NotAFeed = "notAFeed";
    case Gone = "gone";
    case StarterGone = "starterGone";
    case QueueGone = "queueGone";
}
