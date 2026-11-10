<?php

namespace Peal\Types;

enum InboxAbilityStanding: string
{
    case Available = "available";
    case Reconnect = "reconnect";
    case Unsupported = "unsupported";
}
