<?php

namespace Peal\Types;

enum FieldType: string
{
    case Boolean = "boolean";
    case Choice = "choice";
    case Integer = "integer";
    case Text = "text";
    case TextList = "textList";
}
