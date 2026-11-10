<?php

namespace Peal\Types;

enum GoogleBusinessPostType: string
{
    case Standard = "standard";
    case Event = "event";
    case Offer = "offer";
}
