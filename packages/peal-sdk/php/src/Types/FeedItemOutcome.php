<?php

namespace Peal\Types;

enum FeedItemOutcome: string
{
    case Made = "made";
    case HeldBack = "heldBack";
    case Skipped = "skipped";
    case Claimed = "claimed";
    case Abandoned = "abandoned";
}
