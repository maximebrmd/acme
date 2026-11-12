<?php

namespace Peal\Types;

enum FeedStoppedReason: string
{
    case Unreachable = "unreachable";
    case NotAFeed = "notAFeed";
    case Gone = "gone";
    case StarterGone = "starterGone";
    case QueueGone = "queueGone";
}
