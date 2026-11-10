<?php

namespace Peal\Types;

enum AdsMode: string
{
    case Off = "off";
    case Read = "read";
    case Spend = "spend";
}
