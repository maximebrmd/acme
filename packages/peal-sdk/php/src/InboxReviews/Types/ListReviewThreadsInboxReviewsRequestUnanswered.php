<?php

namespace Peal\InboxReviews\Types;

enum ListReviewThreadsInboxReviewsRequestUnanswered: string
{
    case True = "true";
    case False = "false";
}
