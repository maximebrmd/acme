<?php

namespace Peal\Types;

enum InboxReplyStatus: string
{
    case Sending = "sending";
    case Sent = "sent";
    case Failed = "failed";
    case Unconfirmed = "unconfirmed";
    case Withdrawn = "withdrawn";
}
