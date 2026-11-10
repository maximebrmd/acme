<?php

namespace Peal\Types;

enum MediaTooLargeEncodedKind: string
{
    case Image = "image";
    case Video = "video";
    case Document = "document";
}
