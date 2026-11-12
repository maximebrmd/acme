<?php

namespace Peal\Types;

enum ImageProviderAddressRefusal: string
{
    case Malformed = "malformed";
    case NotHttps = "notHttps";
    case Credentials = "credentials";
    case QueryOrFragment = "queryOrFragment";
    case TooLong = "tooLong";
    case NotPublic = "notPublic";
    case UnknownHost = "unknownHost";
}
