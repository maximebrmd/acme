<?php

namespace Peal\Types;

enum AssistantInputRejectedEncodedReason: string
{
    case Empty = "empty";
    case TooLong = "tooLong";
}
