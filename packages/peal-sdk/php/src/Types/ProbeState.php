<?php

namespace Peal\Types;

enum ProbeState: string
{
    case Pending = "pending";
    case Unavailable = "unavailable";
    case Unreadable = "unreadable";
    case TimedOut = "timedOut";
    case TooLarge = "tooLarge";
    case ToolFailed = "toolFailed";
    case TooManyPages = "tooManyPages";
}
