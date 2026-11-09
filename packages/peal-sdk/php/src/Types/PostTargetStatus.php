<?php

namespace Peal\Types;

enum PostTargetStatus: string
{
    case Pending = "pending";
    case Publishing = "publishing";
    case Published = "published";
    case Failed = "failed";
    case Unconfirmed = "unconfirmed";
    case Cancelled = "cancelled";
}
