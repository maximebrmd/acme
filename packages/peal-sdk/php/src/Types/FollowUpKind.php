<?php

namespace Peal\Types;

enum FollowUpKind: string
{
    case Comment = "comment";
    case Repost = "repost";
}
