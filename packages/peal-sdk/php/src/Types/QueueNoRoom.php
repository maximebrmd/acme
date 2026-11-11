<?php

namespace Peal\Types;

enum QueueNoRoom: string
{
    case NoSlots = "noSlots";
    case Full = "full";
}
