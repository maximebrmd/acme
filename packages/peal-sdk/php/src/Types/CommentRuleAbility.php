<?php

namespace Peal\Types;

enum CommentRuleAbility: string
{
    case Available = "available";
    case NoApi = "noApi";
    case NotAllowed = "notAllowed";
    case Unsupported = "unsupported";
    case Reconnect = "reconnect";
    case TextTooLong = "textTooLong";
}
