<?php

namespace Peal\Types;

enum PlanLimit: string
{
    case Channels = "channels";
    case Members = "members";
    case ScheduledPosts = "scheduledPosts";
    case AssistantRequests = "assistantRequests";
}
