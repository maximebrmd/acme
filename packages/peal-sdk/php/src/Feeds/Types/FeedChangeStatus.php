<?php

namespace Peal\Feeds\Types;

enum FeedChangeStatus: string
{
    case Active = "active";
    case Paused = "paused";
}
