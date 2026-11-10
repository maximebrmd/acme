<?php

namespace Peal\Types;

enum AdAuditEntryByKind: string
{
    case User = "user";
    case ApiKey = "apiKey";
}
