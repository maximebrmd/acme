<?php

namespace Peal\Types;

enum RecyclingStatus: string
{
    case Active = "active";
    case Paused = "paused";
    case Ended = "ended";
}
