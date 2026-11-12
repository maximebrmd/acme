<?php

namespace Peal\Types;

enum FeedUnreadableEncodedReason: string
{
    case NotAFeed = "notAFeed";
    case TooLarge = "tooLarge";
    case Unreachable = "unreachable";
}
