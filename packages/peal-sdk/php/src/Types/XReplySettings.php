<?php

namespace Peal\Types;

enum XReplySettings: string
{
    case Following = "following";
    case MentionedUsers = "mentionedUsers";
    case Subscribers = "subscribers";
    case Verified = "verified";
}
