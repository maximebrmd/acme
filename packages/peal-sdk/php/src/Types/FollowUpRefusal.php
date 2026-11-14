<?php

namespace Peal\Types;

enum FollowUpRefusal: string
{
    case NoAction = "noAction";
    case EmptyComment = "emptyComment";
    case PostCancelled = "postCancelled";
    case NoChannel = "noChannel";
    case AlreadyFollowedUp = "alreadyFollowedUp";
    case WindowPassed = "windowPassed";
    case Channels = "channels";
}
