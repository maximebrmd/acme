<?php

namespace Peal\Types;

enum PostNotPromotableEncodedReason: string
{
    case NotPublished = "notPublished";
    case Platform = "platform";
    case Connection = "connection";
}
