<?php

namespace Peal\Types;

enum AdAccountStatus: string
{
    case Active = "active";
    case InGracePeriod = "inGracePeriod";
    case Unsettled = "unsettled";
    case PendingReview = "pendingReview";
    case Disabled = "disabled";
    case Closed = "closed";
    case Unknown = "unknown";
}
