<?php

namespace Peal\Types;

enum AdObjectStatus: string
{
    case Active = "active";
    case Paused = "paused";
    case InReview = "inReview";
    case Rejected = "rejected";
    case WithIssues = "withIssues";
    case Archived = "archived";
    case Deleted = "deleted";
    case Unknown = "unknown";
}
