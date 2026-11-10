<?php

namespace Peal\Types;

enum Permission: string
{
    case AnalyticsRead = "analytics:read";
    case ApiKeyCreate = "apiKey:create";
    case ApiKeyRead = "apiKey:read";
    case ApiKeyUpdate = "apiKey:update";
    case ApiKeyDelete = "apiKey:delete";
    case AssistantUse = "assistant:use";
    case BillingRead = "billing:read";
    case BillingManage = "billing:manage";
    case ChannelRead = "channel:read";
    case ChannelConnect = "channel:connect";
    case ChannelDisconnect = "channel:disconnect";
    case InvitationCreate = "invitation:create";
    case InvitationCancel = "invitation:cancel";
    case MediaRead = "media:read";
    case MediaUpload = "media:upload";
    case MediaDelete = "media:delete";
    case MemberCreate = "member:create";
    case MemberUpdate = "member:update";
    case MemberDelete = "member:delete";
    case OrganizationUpdate = "organization:update";
    case OrganizationDelete = "organization:delete";
    case PartnerRead = "partner:read";
    case PartnerManage = "partner:manage";
    case PostRead = "post:read";
    case PostCreate = "post:create";
    case PostUpdate = "post:update";
    case PostDelete = "post:delete";
    case PostSchedule = "post:schedule";
    case PostApprove = "post:approve";
    case PostPublish = "post:publish";
    case WebhookRead = "webhook:read";
    case WebhookManage = "webhook:manage";
}
