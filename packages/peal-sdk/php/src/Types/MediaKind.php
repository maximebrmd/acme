<?php

namespace Peal\Types;

enum MediaKind: string
{
    case Image = "image";
    case Video = "video";
    case Document = "document";
}
