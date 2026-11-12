<?php

namespace Peal\Types;

enum UnconfirmedReason: string
{
    case NoResponse = "noResponse";
    case UnreadableResponse = "unreadableResponse";
    case Interrupted = "interrupted";
    case AdapterFailure = "adapterFailure";
    case StillProcessing = "stillProcessing";
}
