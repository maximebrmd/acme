<?php

namespace Peal\Types;

enum ApprovalPolicy: string
{
    case Never = "never";
    case ContributorsAndApplications = "contributorsAndApplications";
    case Always = "always";
}
