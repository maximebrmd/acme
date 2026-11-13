<?php

namespace Peal\Types;

enum TextProviderKind: string
{
    case Anthropic = "anthropic";
    case OpenaiCompatible = "openai-compatible";
}
