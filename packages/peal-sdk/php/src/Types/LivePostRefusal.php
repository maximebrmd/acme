<?php

namespace Peal\Types;

enum LivePostRefusal: string
{
    case NotPublished = "notPublished";
    case AlreadyRemoved = "alreadyRemoved";
    case NoPlatformId = "noPlatformId";
    case NotSupported = "notSupported";
    case ChangeInProgress = "changeInProgress";
    case ChannelUnavailable = "channelUnavailable";
    case BoostRunning = "boostRunning";
    case ApprovalRequired = "approvalRequired";
}
