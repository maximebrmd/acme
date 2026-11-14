<?php

namespace Peal\Types;

enum PostPartsNotSent: string
{
    case FirstComment = "firstComment";
    case LaterParts = "laterParts";
}
