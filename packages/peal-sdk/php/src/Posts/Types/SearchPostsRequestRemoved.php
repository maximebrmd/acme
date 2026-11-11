<?php

namespace Peal\Posts\Types;

enum SearchPostsRequestRemoved: string
{
    case True = "true";
    case False = "false";
}
