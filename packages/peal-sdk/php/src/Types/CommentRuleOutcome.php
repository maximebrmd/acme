<?php

namespace Peal\Types;

enum CommentRuleOutcome: string
{
    case Claimed = "claimed";
    case Replied = "replied";
    case SamePerson = "samePerson";
    case Refused = "refused";
}
