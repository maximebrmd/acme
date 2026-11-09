<?php

namespace Peal\Types;

enum AssistantFailedEncodedReason: string
{
    case Unreachable = "unreachable";
    case TimedOut = "timedOut";
    case Declined = "declined";
    case InvalidAnswer = "invalidAnswer";
}
