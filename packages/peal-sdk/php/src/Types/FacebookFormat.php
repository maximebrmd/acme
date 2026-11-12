<?php

namespace Peal\Types;

enum FacebookFormat: string
{
    case Feed = "feed";
    case Story = "story";
    case Reel = "reel";
}
