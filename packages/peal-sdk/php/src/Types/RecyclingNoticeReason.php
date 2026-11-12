<?php

namespace Peal\Types;

enum RecyclingNoticeReason: string
{
    case SourceGone = "sourceGone";
    case StarterGone = "starterGone";
    case NoChannels = "noChannels";
    case ContentRejected = "contentRejected";
    case PlanLimit = "planLimit";
    case QueueGone = "queueGone";
    case QueueFull = "queueFull";
    case SourceWithdrawn = "sourceWithdrawn";
}
