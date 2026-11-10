<?php

namespace Peal\Types;

enum SpecialAdCategory: string
{
    case None = "none";
    case Housing = "housing";
    case Employment = "employment";
    case FinancialProductsServices = "financialProductsServices";
    case IssuesElectionsPolitics = "issuesElectionsPolitics";
}
