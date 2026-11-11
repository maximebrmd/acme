<?php

namespace Peal\Types;

enum LivePostChangeStatus: string
{
    case Pending = "pending";
    case Done = "done";
    case Failed = "failed";
}
