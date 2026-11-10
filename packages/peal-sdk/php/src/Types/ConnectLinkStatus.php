<?php

namespace Peal\Types;

enum ConnectLinkStatus: string
{
    case Pending = "pending";
    case Completed = "completed";
    case Revoked = "revoked";
    case Expired = "expired";
}
