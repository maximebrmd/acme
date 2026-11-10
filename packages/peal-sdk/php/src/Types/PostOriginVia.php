<?php

namespace Peal\Types;

enum PostOriginVia: string
{
    case Web = "web";
    case ApiKey = "apiKey";
    case Application = "application";
}
