<?php

namespace Peal\Types;

enum ReviewLinkStatus: string
{
    case Active = "active";
    case Expired = "expired";
    case Revoked = "revoked";
}
