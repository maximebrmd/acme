<?php

namespace Peal\Types;

enum PostStatus: string
{
    case Draft = "draft";
    case Scheduled = "scheduled";
    case Publishing = "publishing";
    case Finished = "finished";
    case Cancelled = "cancelled";
}
