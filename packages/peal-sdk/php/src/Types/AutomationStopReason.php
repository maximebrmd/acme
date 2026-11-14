<?php

namespace Peal\Types;

enum AutomationStopReason: string
{
    case StarterGone = "starterGone";
    case ChannelGone = "channelGone";
}
