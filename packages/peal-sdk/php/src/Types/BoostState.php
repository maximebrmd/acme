<?php

namespace Peal\Types;

enum BoostState: string
{
    case Requested = "requested";
    case Active = "active";
    case Paused = "paused";
    case Ended = "ended";
    case Stopped = "stopped";
    case Failed = "failed";
    case Unconfirmed = "unconfirmed";
}
