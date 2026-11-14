<?php

namespace Peal\Types;

enum FollowUpNotSentReason: string
{
    case Failed = "failed";
    case Unconfirmed = "unconfirmed";
    case WindowEnded = "windowEnded";
    case NotGranted = "notGranted";
    case NotApproved = "notApproved";
}
