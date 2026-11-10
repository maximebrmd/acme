<?php

namespace Peal\Types;

enum ReviewParty: string
{
    case Member = "member";
    case Visitor = "visitor";
    case Application = "application";
}
