<?php

namespace Peal\Types;

enum WebhookEndpointScope: string
{
    case Workspace = "workspace";
    case Partner = "partner";
}
