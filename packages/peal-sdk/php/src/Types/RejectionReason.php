<?php

namespace Peal\Types;

enum RejectionReason: string
{
    case SizeMismatch = "sizeMismatch";
    case TypeMismatch = "typeMismatch";
}
