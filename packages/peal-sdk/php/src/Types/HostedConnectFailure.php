<?php

namespace Peal\Types;

enum HostedConnectFailure: string
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
    case LinkExpired = "linkExpired";
    case LinkCompleted = "linkCompleted";
    case LinkRevoked = "linkRevoked";
    case TooManyAttempts = "tooManyAttempts";
    case PlanLimit = "planLimit";
    case ChannelGone = "channelGone";
    case PlatformUnreachable = "platformUnreachable";
}
