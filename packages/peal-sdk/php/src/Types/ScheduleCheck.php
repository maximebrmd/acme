<?php

namespace Peal\Types;

enum ScheduleCheck: string
{
    case Ok = "ok";
    case InPast = "inPast";
    case InvalidTimeZone = "invalidTimeZone";
}
