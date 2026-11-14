<?php

namespace Peal\Types;

enum ArticleSiteStatus: string
{
    case Publish = "publish";
    case Draft = "draft";
    case Future = "future";
}
