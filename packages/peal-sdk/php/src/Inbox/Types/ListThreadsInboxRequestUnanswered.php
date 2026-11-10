<?php

namespace Peal\Inbox\Types;

enum ListThreadsInboxRequestUnanswered: string
{
    case True = "true";
    case False = "false";
}
