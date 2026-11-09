<?php

namespace Peal\Types;

enum MediaContentType: string
{
    case ImageGif = "image/gif";
    case ImageJpeg = "image/jpeg";
    case ImagePng = "image/png";
    case ImageWebp = "image/webp";
    case VideoMp4 = "video/mp4";
    case VideoQuicktime = "video/quicktime";
}
