<?php

namespace Peal\Types;

enum InboxCollectionEnd: string
{
    case Window = "window";
    case Disconnected = "disconnected";
    case Unsupported = "unsupported";
    case Missing = "missing";
    case Removed = "removed";
}
