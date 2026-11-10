<?php

namespace Peal\Types;

enum ImportColumn: string
{
    case Text = "text";
    case Channels = "channels";
    case Media = "media";
    case At = "at";
    case TimeZone = "time_zone";
    case AllowDuplicate = "allow_duplicate";
    case IdempotencyKey = "idempotency_key";
}
