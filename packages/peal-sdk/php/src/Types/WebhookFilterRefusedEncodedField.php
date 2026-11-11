<?php

namespace Peal\Types;

enum WebhookFilterRefusedEncodedField: string
{
    case ChannelIds = "channelIds";
    case WorkspaceIds = "workspaceIds";
}
