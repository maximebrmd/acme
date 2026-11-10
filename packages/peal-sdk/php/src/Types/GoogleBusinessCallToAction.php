<?php

namespace Peal\Types;

enum GoogleBusinessCallToAction: string
{
    case Book = "book";
    case Order = "order";
    case Shop = "shop";
    case LearnMore = "learnMore";
    case SignUp = "signUp";
    case Call = "call";
}
