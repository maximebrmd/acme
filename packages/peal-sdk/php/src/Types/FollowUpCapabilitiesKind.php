<?php

namespace Peal\Types;

enum FollowUpCapabilitiesKind: string
{
    case Thread = "thread";
    case Comment = "comment";
}
