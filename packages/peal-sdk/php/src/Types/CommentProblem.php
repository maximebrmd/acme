<?php

namespace Peal\Types;

enum CommentProblem: string
{
    case Text = "text";
    case Name = "name";
    case Parent_ = "parent";
    case Anchor = "anchor";
    case Selection = "selection";
}
