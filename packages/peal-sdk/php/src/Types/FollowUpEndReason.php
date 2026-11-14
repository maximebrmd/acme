<?php

namespace Peal\Types;

enum FollowUpEndReason: string
{
    case Stopped = "stopped";
    case Completed = "completed";
    case StarterGone = "starterGone";
}
