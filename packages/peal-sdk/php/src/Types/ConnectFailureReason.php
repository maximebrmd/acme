<?php

namespace Peal\Types;

enum ConnectFailureReason: string
{
    case PlatformNotSupported = "platformNotSupported";
    case NotConfigured = "notConfigured";
    case InvalidInstance = "invalidInstance";
    case InstanceNotAllowed = "instanceNotAllowed";
    case InvalidHandle = "invalidHandle";
    case InvalidState = "invalidState";
    case Denied = "denied";
    case AuthorizationFailed = "authorizationFailed";
    case AccountMismatch = "accountMismatch";
    case NoAccounts = "noAccounts";
}
