<?php

namespace Peal\Types;

enum InboxReviewState: string
{
    case New_ = "new";
    case Answered = "answered";
}
