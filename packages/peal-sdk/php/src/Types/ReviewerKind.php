<?php

namespace Peal\Types;

enum ReviewerKind: string
{
    case Member = "member";
    case ApiKey = "apiKey";
    case Visitor = "visitor";
}
