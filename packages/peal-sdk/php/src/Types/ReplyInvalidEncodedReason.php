<?php

namespace Peal\Types;

enum ReplyInvalidEncodedReason: string
{
    case Empty = "empty";
    case TooLong = "tooLong";
}
