<?php

namespace Peal\Types;

enum BoostStepOutcome: string
{
    case Done = "done";
    case Refused = "refused";
    case Found = "found";
    case Absent = "absent";
    case Unknown = "unknown";
}
