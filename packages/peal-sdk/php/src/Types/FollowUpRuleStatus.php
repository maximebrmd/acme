<?php

namespace Peal\Types;

enum FollowUpRuleStatus: string
{
    case Active = "active";
    case Paused = "paused";
    case Ended = "ended";
}
