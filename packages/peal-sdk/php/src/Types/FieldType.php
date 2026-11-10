<?php

namespace Peal\Types;

enum FieldType: string
{
    case Boolean = "boolean";
    case Choice = "choice";
    case Integer = "integer";
    case MentionList = "mentionList";
    case Text = "text";
    case TextList = "textList";
}
