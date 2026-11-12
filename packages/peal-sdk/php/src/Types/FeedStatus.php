<?php

namespace Peal\Types;

enum FeedStatus: string
{
    case Active = "active";
    case Paused = "paused";
    case Stopped = "stopped";
}
