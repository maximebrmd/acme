<?php

namespace Peal\Types;

enum InboxActionUnavailableEncodedStanding: string
{
    case Reconnect = "reconnect";
    case Unsupported = "unsupported";
}
