<?php

namespace Peal\Types;

enum InboxCommentState: string
{
    case New_ = "new";
    case Answered = "answered";
    case Hidden = "hidden";
    case Deleted = "deleted";
}
