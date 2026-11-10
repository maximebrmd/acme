<?php

namespace Peal\Types;

enum NoticeEventAdBoostChangedChange: string
{
    case Started = "started";
    case Ended = "ended";
    case Failed = "failed";
    case BudgetReached = "budgetReached";
    case Unconfirmed = "unconfirmed";
}
