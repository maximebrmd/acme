<?php

namespace Peal\Types;

enum Plan: string
{
    case Free = "free";
    case Starter = "starter";
    case Pro = "pro";
    case Business = "business";
    case Agency = "agency";
}
