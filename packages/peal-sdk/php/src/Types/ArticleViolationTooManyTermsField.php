<?php

namespace Peal\Types;

enum ArticleViolationTooManyTermsField: string
{
    case Categories = "categories";
    case Tags = "tags";
}
