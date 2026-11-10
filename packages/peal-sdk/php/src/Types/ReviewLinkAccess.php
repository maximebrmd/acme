<?php

namespace Peal\Types;

enum ReviewLinkAccess: string
{
    case View = "view";
    case Comment = "comment";
    case Approve = "approve";
}
