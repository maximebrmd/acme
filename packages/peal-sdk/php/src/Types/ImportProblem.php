<?php

namespace Peal\Types;

enum ImportProblem: string
{
    case Empty = "empty";
    case UnterminatedQuote = "unterminatedQuote";
    case UnknownColumn = "unknownColumn";
    case RepeatedColumn = "repeatedColumn";
    case MissingColumn = "missingColumn";
    case TooManyRows = "tooManyRows";
}
