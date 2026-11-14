<?php

namespace Peal\Types;

enum CommentRuleEndReason: string
{
    case Stopped = "stopped";
    case StarterGone = "starterGone";
    case ChannelGone = "channelGone";
}
