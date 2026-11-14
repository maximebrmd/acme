<?php

namespace Peal\Types;

enum PartnerDetailField: string
{
    case Name = "name";
    case LogoUrl = "logoUrl";
    case AccentColor = "accentColor";
    case ReturnOrigins = "returnOrigins";
    case ExternalId = "externalId";
    case Permissions = "permissions";
}
