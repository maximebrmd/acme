<?php

namespace Peal\Types;

enum CampaignObjective: string
{
    case Awareness = "awareness";
    case Traffic = "traffic";
    case Engagement = "engagement";
    case Leads = "leads";
    case AppPromotion = "appPromotion";
    case Sales = "sales";
    case Other = "other";
}
