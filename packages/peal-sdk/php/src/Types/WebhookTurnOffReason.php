<?php

namespace Peal\Types;

enum WebhookTurnOffReason: string
{
    case Failing = "failing";
    case Gone = "gone";
}
