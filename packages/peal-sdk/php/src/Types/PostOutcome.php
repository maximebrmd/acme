<?php

namespace Peal\Types;

enum PostOutcome: string
{
    case Published = "published";
    case PartiallyPublished = "partiallyPublished";
    case Unconfirmed = "unconfirmed";
    case Failed = "failed";
    case Cancelled = "cancelled";
}
