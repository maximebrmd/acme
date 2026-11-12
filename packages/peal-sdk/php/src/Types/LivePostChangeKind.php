<?php

namespace Peal\Types;

enum LivePostChangeKind: string
{
    case Unpublish = "unpublish";
    case Edit = "edit";
}
