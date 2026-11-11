<?php

namespace Peal\Types;

enum ReshuffleStop: string
{
    case PlanLimit = "planLimit";
    case Full = "full";
    case Changed = "changed";
}
