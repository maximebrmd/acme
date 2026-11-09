<?php

namespace Peal\Types;

enum TextUnit: string
{
    case Graphemes = "graphemes";
    case CodePoints = "codePoints";
    case Utf8Bytes = "utf8Bytes";
    case EmojiBytes = "emojiBytes";
    case Utf16Units = "utf16Units";
    case Weighted = "weighted";
}
