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
    case ChannelConnected = "channel.connected";
    case ChannelDisconnected = "channel.disconnected";
    case ChannelReconnectNeeded = "channel.reconnect_needed";
    case MediaReady = "media.ready";
    case MediaFailed = "media.failed";
    case WebhookTest = "webhook.test";
}
