<?php

namespace Peal\Types;

enum FollowUpStatus: string
{
    case Armed = "armed";
    case Waiting = "waiting";
    case Sending = "sending";
    case Sent = "sent";
    case Failed = "failed";
    case Unconfirmed = "unconfirmed";
    case Expired = "expired";
    case Cancelled = "cancelled";
}
