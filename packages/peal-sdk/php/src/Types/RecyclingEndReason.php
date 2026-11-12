<?php

namespace Peal\Types;

enum RecyclingEndReason: string
{
    case Completed = "completed";
    case Stopped = "stopped";
    case SourceGone = "sourceGone";
    case StarterGone = "starterGone";
    case NoChannels = "noChannels";
    case ContentRejected = "contentRejected";
    case PlanLimit = "planLimit";
    case QueueGone = "queueGone";
    case QueueFull = "queueFull";
}
