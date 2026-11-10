<?php

namespace Peal\Types;

enum WebhookDeliveryFailure: string
{
    case Exhausted = "exhausted";
    case Gone = "gone";
    case EndpointDisabled = "endpointDisabled";
    case NotConfigured = "notConfigured";
}
