<?php

namespace Peal\Types;

enum WebhookEventType: string
{
    case PostScheduled = "post.scheduled";
    case PostUnscheduled = "post.unscheduled";
    case PostPublished = "post.published";
    case PostFailed = "post.failed";
    case PostUnconfirmed = "post.unconfirmed";
    case PostCancelled = "post.cancelled";
    case PostFinished = "post.finished";
    case PostUnpublished = "post.unpublished";
    case PostUnpublishFailed = "post.unpublish_failed";
    case PostEdited = "post.edited";
    case PostEditFailed = "post.edit_failed";
    case PostApprovalRequested = "post.approval_requested";
    case PostApproved = "post.approved";
    case PostChangesRequested = "post.changes_requested";
    case ChannelConnected = "channel.connected";
    case ChannelDisconnected = "channel.disconnected";
    case ChannelReconnectNeeded = "channel.reconnect_needed";
    case ChannelDisabled = "channel.disabled";
    case ChannelEnabled = "channel.enabled";
    case ChannelExpiring = "channel.expiring";
    case MediaReady = "media.ready";
    case MediaFailed = "media.failed";
    case CommentReceived = "comment.received";
    case CommentReplied = "comment.replied";
    case ReviewReceived = "review.received";
    case ReviewReplied = "review.replied";
    case MessageReceived = "message.received";
    case MessageSent = "message.sent";
    case BoostStarted = "boost.started";
    case BoostPaused = "boost.paused";
    case BoostResumed = "boost.resumed";
    case BoostStopped = "boost.stopped";
    case BoostEnded = "boost.ended";
    case BoostFailed = "boost.failed";
    case BoostUnconfirmed = "boost.unconfirmed";
    case BoostBudgetReached = "boost.budget_reached";
    case ArticlePublished = "article.published";
    case ArticleFailed = "article.failed";
    case WebhookTest = "webhook.test";
}
