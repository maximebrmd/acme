<?php

namespace Peal\Types;

enum PostNotReviewableEncodedStatus: string
{
    case Published = "published";
    case Cancelled = "cancelled";
}
