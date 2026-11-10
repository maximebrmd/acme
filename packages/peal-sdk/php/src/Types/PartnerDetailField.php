<?php

namespace Peal\Types;

enum PartnerDetailField: string
{
    case Name = "name";
    case LogoUrl = "logoUrl";
    case ReturnOrigins = "returnOrigins";
    case ExternalId = "externalId";
    case Permissions = "permissions";
}
