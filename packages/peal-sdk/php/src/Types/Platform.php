<?php

namespace Peal\Types;

enum Platform: string
{
    case X = "x";
    case Linkedin = "linkedin";
    case Bluesky = "bluesky";
    case Mastodon = "mastodon";
    case Threads = "threads";
    case Instagram = "instagram";
    case Facebook = "facebook";
    case Tiktok = "tiktok";
    case Youtube = "youtube";
    case Pinterest = "pinterest";
}
