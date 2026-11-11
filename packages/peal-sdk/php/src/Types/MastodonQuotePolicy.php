<?php

namespace Peal\Types;

enum MastodonQuotePolicy: string
{
    case Public_ = "public";
    case Followers = "followers";
    case Nobody = "nobody";
}
