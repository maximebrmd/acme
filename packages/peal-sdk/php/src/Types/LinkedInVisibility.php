<?php

namespace Peal\Types;

enum LinkedInVisibility: string
{
    case Public_ = "public";
    case Connections = "connections";
    case LoggedIn = "loggedIn";
}
