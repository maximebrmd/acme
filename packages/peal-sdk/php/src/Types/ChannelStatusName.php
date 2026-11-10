<?php

namespace Peal\Types;

enum ChannelStatusName: string
{
    case Active = "active";
    case RefreshNeeded = "refreshNeeded";
    case Disabled = "disabled";
}
