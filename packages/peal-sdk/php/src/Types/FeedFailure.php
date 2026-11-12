<?php

namespace Peal\Types;

enum FeedFailure: string
{
    case Timeout = "timeout";
    case RateLimited = "rateLimited";
    case ServerError = "serverError";
    case NotFound = "notFound";
    case Gone = "gone";
    case NotAFeed = "notAFeed";
    case TooLarge = "tooLarge";
    case Refused = "refused";
    case Unreachable = "unreachable";
}
