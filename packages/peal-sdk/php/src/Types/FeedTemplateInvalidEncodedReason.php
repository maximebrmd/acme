<?php

namespace Peal\Types;

enum FeedTemplateInvalidEncodedReason: string
{
    case Empty = "empty";
    case TooLong = "tooLong";
    case UnknownPlaceholder = "unknownPlaceholder";
}
