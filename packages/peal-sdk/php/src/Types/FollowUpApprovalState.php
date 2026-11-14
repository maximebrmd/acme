<?php

namespace Peal\Types;

enum FollowUpApprovalState: string
{
    case NotNeeded = "notNeeded";
    case Pending = "pending";
    case Approved = "approved";
}
