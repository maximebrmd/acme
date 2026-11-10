<?php

namespace Peal\Types;

enum BoostFailureReason: string
{
    case AccountUnusable = "accountUnusable";
    case AccountSpendCap = "accountSpendCap";
    case CeilingExceeded = "ceilingExceeded";
    case SpendingOff = "spendingOff";
    case CurrencyMismatch = "currencyMismatch";
    case BudgetTooLow = "budgetTooLow";
    case PostNotPromotable = "postNotPromotable";
    case PermissionMissing = "permissionMissing";
    case ReconnectNeeded = "reconnectNeeded";
    case NetworkUnavailable = "networkUnavailable";
    case Refused = "refused";
    case SpendingUnavailable = "spendingUnavailable";
}
