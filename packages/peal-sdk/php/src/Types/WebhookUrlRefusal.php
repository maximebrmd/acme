<?php

namespace Peal\Types;

enum WebhookUrlRefusal: string
{
    case Malformed = "malformed";
    case NotHttps = "notHttps";
    case Credentials = "credentials";
    case TooLong = "tooLong";
    case NotPublic = "notPublic";
    case UnknownHost = "unknownHost";
}
