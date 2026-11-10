<?php

namespace Peal\Types;

enum PartnerScope: string
{
    case WorkspacesRead = "workspaces:read";
    case WorkspacesWrite = "workspaces:write";
    case WorkspacesDelete = "workspaces:delete";
}
