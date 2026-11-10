<?php

namespace Peal\Types;

enum AdAuditAction: string
{
    case AccountConnected = "accountConnected";
    case AccountDisconnected = "accountDisconnected";
    case SpendingEnabled = "spendingEnabled";
    case SpendingDisabled = "spendingDisabled";
    case CeilingChanged = "ceilingChanged";
    case BoostRequested = "boostRequested";
    case BoostStarted = "boostStarted";
    case BoostUnconfirmed = "boostUnconfirmed";
    case BoostFailed = "boostFailed";
    case BoostPaused = "boostPaused";
    case BoostResumed = "boostResumed";
    case BoostStopped = "boostStopped";
    case BoostEnded = "boostEnded";
}
