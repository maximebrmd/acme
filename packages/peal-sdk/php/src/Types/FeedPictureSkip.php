<?php

namespace Peal\Types;

enum FeedPictureSkip: string
{
    case NotPublic = "notPublic";
    case Unreachable = "unreachable";
    case TooLarge = "tooLarge";
    case NotAnImage = "notAnImage";
    case StorageFull = "storageFull";
    case Busy = "busy";
    case NotAllowed = "notAllowed";
    case Failed = "failed";
}
