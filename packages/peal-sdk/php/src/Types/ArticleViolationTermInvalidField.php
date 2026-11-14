<?php

namespace Peal\Types;

enum ArticleViolationTermInvalidField: string
{
    case Categories = "categories";
    case Tags = "tags";
}
