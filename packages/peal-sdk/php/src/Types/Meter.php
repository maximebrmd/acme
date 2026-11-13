<?php

namespace Peal\Types;

enum Meter: string
{
    case AssistantRequests = "assistantRequests";
    case AssistantImages = "assistantImages";
    case OutboundMessages = "outboundMessages";
    case ManagedAds = "managedAds";
    case XApi = "xApi";
}
