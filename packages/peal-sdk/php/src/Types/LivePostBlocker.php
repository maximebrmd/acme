<?php

namespace Peal\Types;

enum LivePostBlocker: string
{
    case NoApi = "noApi";
    case Permission = "permission";
    case Unverified = "unverified";
}
