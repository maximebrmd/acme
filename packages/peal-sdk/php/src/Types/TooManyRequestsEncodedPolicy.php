<?php

namespace Peal\Types;

enum TooManyRequestsEncodedPolicy: string
{
    case Default_ = "default";
    case Free = "free";
    case Override = "override";
}
