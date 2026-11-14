<?php

namespace Peal\Types;

enum InboxOwnerReplyModeration: string
{
    case Pending = "pending";
    case Approved = "approved";
    case Rejected = "rejected";
}
