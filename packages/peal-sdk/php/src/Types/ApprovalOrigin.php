<?php

namespace Peal\Types;

enum ApprovalOrigin: string
{
    case Member = "member";
    case ApiKey = "apiKey";
    case Application = "application";
}
