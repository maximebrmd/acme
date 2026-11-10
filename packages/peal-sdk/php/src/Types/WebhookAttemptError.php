<?php

namespace Peal\Types;

enum WebhookAttemptError: string
{
    case Timeout = "timeout";
    case Connection = "connection";
    case Refused = "refused";
}
