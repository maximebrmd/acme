<?php

namespace Peal\Types;

enum AdAccountUnusableEncodedReason: string
{
    case Status = "status";
    case ReconnectNeeded = "reconnectNeeded";
    case Permission = "permission";
}
