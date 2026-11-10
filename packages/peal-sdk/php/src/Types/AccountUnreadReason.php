<?php

namespace Peal\Types;

enum AccountUnreadReason: string
{
    case Disabled = "disabled";
    case Disconnected = "disconnected";
    case PlatformUnreachable = "platformUnreachable";
    case RateLimited = "rateLimited";
    case Reconnect = "reconnect";
}
