<?php

namespace Peal\Types;

enum AllowanceReason: string
{
    case PaymentMethodRequired = "paymentMethodRequired";
    case CeilingReached = "ceilingReached";
    case NotEnabled = "notEnabled";
    case PlanAllowance = "planAllowance";
    case PaymentFailed = "paymentFailed";
    case SpendCapReached = "spendCapReached";
}
