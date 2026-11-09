<?php

namespace Peal\Types;

enum YouTubePrivacy: string
{
    case Public_ = "public";
    case Unlisted = "unlisted";
    case Private_ = "private";
}
