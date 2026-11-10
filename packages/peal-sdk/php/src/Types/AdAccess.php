<?php

namespace Peal\Types;

enum AdAccess: string
{
    case Working = "working";
    case ReconnectNeeded = "reconnectNeeded";
}
