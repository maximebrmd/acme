<?php

namespace Peal\Types;

enum NonFiniteNumber: string
{
    case Infinity = "Infinity";
    case NaN = "NaN";
}
