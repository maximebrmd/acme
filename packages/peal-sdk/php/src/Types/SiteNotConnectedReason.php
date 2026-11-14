<?php

namespace Peal\Types;

enum SiteNotConnectedReason: string
{
    case NotWordPress = "notWordPress";
    case AddressNotAllowed = "addressNotAllowed";
    case CredentialsRefused = "credentialsRefused";
    case CannotPublish = "cannotPublish";
}
