<?php

namespace Peal\Types;

enum BoostViolation: string
{
    case CurrencyMismatch = "currencyMismatch";
    case BudgetEmpty = "budgetEmpty";
    case EndsBeforeStart = "endsBeforeStart";
    case RunTooShort = "runTooShort";
    case RunTooLong = "runTooLong";
    case StartsTooFarAhead = "startsTooFarAhead";
    case AgeRange = "ageRange";
    case SpecialCategory = "specialCategory";
    case BeneficiaryRequired = "beneficiaryRequired";
}
