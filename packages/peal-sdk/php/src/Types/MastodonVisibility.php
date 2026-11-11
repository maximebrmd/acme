<?php

namespace Peal\Types;

enum MastodonVisibility: string
{
    case Public_ = "public";
    case Unlisted = "unlisted";
    case Private_ = "private";
}
