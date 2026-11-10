<?php

namespace Peal\Types;

enum HeldLimit: string
{
    case Channels = "channels";
    case Members = "members";
    case MediaStorage = "mediaStorage";
}
