<?php

namespace Peal\Types;

enum ImageAspect: string
{
    case Square = "square";
    case Landscape = "landscape";
    case Portrait = "portrait";
}
