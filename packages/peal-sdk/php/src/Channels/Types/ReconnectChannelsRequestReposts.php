<?php

namespace Peal\Channels\Types;

enum ReconnectChannelsRequestReposts: string
{
    case True = "true";
    case False = "false";
}
