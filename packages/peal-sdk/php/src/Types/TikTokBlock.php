<?php

namespace Peal\Types;

enum TikTokBlock: string
{
    case PostLimit = "postLimit";
    case Banned = "banned";
    case ClientLimit = "clientLimit";
}
