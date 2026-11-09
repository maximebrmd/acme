<?php

namespace Peal\Types;

enum Role: string
{
    case Owner = "owner";
    case Admin = "admin";
    case Editor = "editor";
    case Contributor = "contributor";
    case Viewer = "viewer";
}
