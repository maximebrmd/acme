<?php

namespace Peal\Types;

enum ChannelCannotPostEncodedReason: string
{
    case Disabled = "disabled";
    case Reconnect = "reconnect";
}
