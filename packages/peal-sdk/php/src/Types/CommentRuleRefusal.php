<?php

namespace Peal\Types;

enum CommentRuleRefusal: string
{
    case Keywords = "keywords";
    case EmptyReply = "emptyReply";
    case NoChannel = "noChannel";
    case Channels = "channels";
}
