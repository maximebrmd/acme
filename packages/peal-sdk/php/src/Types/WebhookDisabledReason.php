<?php

namespace Peal\Types;

enum WebhookDisabledReason: string
{
    case Manual = "manual";
    case Failing = "failing";
    case Gone = "gone";
}
