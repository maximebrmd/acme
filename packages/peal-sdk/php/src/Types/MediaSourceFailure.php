<?php

namespace Peal\Types;

enum MediaSourceFailure: string
{
    case UnknownHost = "unknownHost";
    case NoAnswer = "noAnswer";
    case BadStatus = "badStatus";
    case TooManyRedirects = "tooManyRedirects";
    case TooSlow = "tooSlow";
}
