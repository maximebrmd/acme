<?php

namespace Peal\Types;

enum ArticleStateName: string
{
    case Draft = "draft";
    case Scheduled = "scheduled";
    case Publishing = "publishing";
    case Published = "published";
    case Failed = "failed";
    case Unconfirmed = "unconfirmed";
}
