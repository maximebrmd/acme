<?php

namespace Peal\Types;

enum AdSignInFailedEncodedReason: string
{
    case Denied = "denied";
    case Expired = "expired";
    case Failed = "failed";
    case NotConfigured = "notConfigured";
}
