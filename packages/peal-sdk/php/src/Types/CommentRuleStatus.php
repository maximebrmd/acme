<?php

namespace Peal\Types;

enum CommentRuleStatus: string
{
    case Active = "active";
    case Paused = "paused";
    case Ended = "ended";
}
