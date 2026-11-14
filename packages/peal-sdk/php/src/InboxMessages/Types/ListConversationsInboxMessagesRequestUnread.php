<?php

namespace Peal\InboxMessages\Types;

enum ListConversationsInboxMessagesRequestUnread: string
{
    case True = "true";
    case False = "false";
}
