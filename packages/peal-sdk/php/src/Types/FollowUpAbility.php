<?php

namespace Peal\Types;

enum FollowUpAbility: string
{
    case Available = "available";
    case NotAsked = "notAsked";
    case NoApi = "noApi";
    case Review = "review";
    case NotBuilt = "notBuilt";
    case NotAllowed = "notAllowed";
    case TurnedOff = "turnedOff";
    case Reconnect = "reconnect";
    case NotCounted = "notCounted";
    case TextTooLong = "textTooLong";
}
