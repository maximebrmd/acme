<?php

namespace Peal\Types;

enum ApprovalStatus: string
{
    case Pending = "pending";
    case Approved = "approved";
    case ChangesRequested = "changesRequested";
    case Withdrawn = "withdrawn";
}
