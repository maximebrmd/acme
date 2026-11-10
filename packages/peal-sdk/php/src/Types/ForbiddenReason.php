<?php

namespace Peal\Types;

enum ForbiddenReason: string
{
    case MissingScope = "missingScope";
    case MissingPermission = "missingPermission";
    case PersonRequired = "personRequired";
    case WrongWorkspace = "wrongWorkspace";
    case Suspended = "suspended";
    case UntrustedOrigin = "untrustedOrigin";
}
