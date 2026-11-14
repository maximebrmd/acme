<?php

namespace Peal\Types;

enum InboxOutgoingMessageStatus: string
{
    case Sending = "sending";
    case Sent = "sent";
    case Failed = "failed";
    case Unconfirmed = "unconfirmed";
}
