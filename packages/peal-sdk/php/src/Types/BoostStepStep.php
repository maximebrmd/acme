<?php

namespace Peal\Types;

enum BoostStepStep: string
{
    case CreateCampaign = "createCampaign";
    case CreateAdSet = "createAdSet";
    case CreateAd = "createAd";
    case ActivateAd = "activateAd";
    case ActivateAdSet = "activateAdSet";
    case ActivateCampaign = "activateCampaign";
    case Pause = "pause";
    case Resume = "resume";
}
