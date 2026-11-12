<?php

namespace Peal\Types;

enum FeedAddressRefusedEncodedReason: string
{
    case Credentials = "credentials";
    case Malformed = "malformed";
    case NotHttps = "notHttps";
    case NotPublic = "notPublic";
}
