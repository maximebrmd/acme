<?php

namespace Peal\Types;

enum NotRecyclableReason: string
{
    case Draft = "draft";
    case AwaitingApproval = "awaitingApproval";
    case Cancelled = "cancelled";
    case Repeating = "repeating";
    case Occurrence = "occurrence";
    case NoChannels = "noChannels";
}
