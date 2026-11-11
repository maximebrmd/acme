<?php

namespace Peal\Types;

enum WebhookRedeliverySkip: string
{
    case AlreadySent = "alreadySent";
    case EndpointDisabled = "endpointDisabled";
    case NotFound = "notFound";
}
