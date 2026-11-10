<?php

namespace Peal\Types;

enum ActivityVia: string
{
    case Session = "session";
    case ApiKey = "apiKey";
    case Oauth = "oauth";
    case Mcp = "mcp";
}
