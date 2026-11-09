<?php

namespace Peal\Types;

enum PaidPlan: string
{
    case Starter = "starter";
    case Pro = "pro";
    case Business = "business";
    case Agency = "agency";
}
