<?php

namespace Peal\Channels\Types;

enum ReconnectChannelsRequestMessages: string
{
    case True = "true";
    case False = "false";
}
