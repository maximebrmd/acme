<?php

namespace Peal\Types;

enum InboxModerationAction: string
{
    case Hide = "hide";
    case Unhide = "unhide";
    case Like = "like";
    case Unlike = "unlike";
    case Delete = "delete";
}
