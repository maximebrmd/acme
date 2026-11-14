using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SubscribableWebhookEventType.SubscribableWebhookEventTypeSerializer))]
[Serializable]
public readonly record struct SubscribableWebhookEventType : IStringEnum
{
    public static readonly SubscribableWebhookEventType PostScheduled = new(Values.PostScheduled);

    public static readonly SubscribableWebhookEventType PostUnscheduled = new(
        Values.PostUnscheduled
    );

    public static readonly SubscribableWebhookEventType PostPublished = new(Values.PostPublished);

    public static readonly SubscribableWebhookEventType PostFailed = new(Values.PostFailed);

    public static readonly SubscribableWebhookEventType PostUnconfirmed = new(
        Values.PostUnconfirmed
    );

    public static readonly SubscribableWebhookEventType PostCancelled = new(Values.PostCancelled);

    public static readonly SubscribableWebhookEventType PostFinished = new(Values.PostFinished);

    public static readonly SubscribableWebhookEventType PostUnpublished = new(
        Values.PostUnpublished
    );

    public static readonly SubscribableWebhookEventType PostUnpublishFailed = new(
        Values.PostUnpublishFailed
    );

    public static readonly SubscribableWebhookEventType PostEdited = new(Values.PostEdited);

    public static readonly SubscribableWebhookEventType PostEditFailed = new(Values.PostEditFailed);

    public static readonly SubscribableWebhookEventType PostApprovalRequested = new(
        Values.PostApprovalRequested
    );

    public static readonly SubscribableWebhookEventType PostApproved = new(Values.PostApproved);

    public static readonly SubscribableWebhookEventType PostChangesRequested = new(
        Values.PostChangesRequested
    );

    public static readonly SubscribableWebhookEventType ChannelConnected = new(
        Values.ChannelConnected
    );

    public static readonly SubscribableWebhookEventType ChannelDisconnected = new(
        Values.ChannelDisconnected
    );

    public static readonly SubscribableWebhookEventType ChannelReconnectNeeded = new(
        Values.ChannelReconnectNeeded
    );

    public static readonly SubscribableWebhookEventType ChannelDisabled = new(
        Values.ChannelDisabled
    );

    public static readonly SubscribableWebhookEventType ChannelEnabled = new(Values.ChannelEnabled);

    public static readonly SubscribableWebhookEventType ChannelExpiring = new(
        Values.ChannelExpiring
    );

    public static readonly SubscribableWebhookEventType MediaReady = new(Values.MediaReady);

    public static readonly SubscribableWebhookEventType MediaFailed = new(Values.MediaFailed);

    public static readonly SubscribableWebhookEventType CommentReceived = new(
        Values.CommentReceived
    );

    public static readonly SubscribableWebhookEventType CommentReplied = new(Values.CommentReplied);

    public static readonly SubscribableWebhookEventType ReviewReceived = new(Values.ReviewReceived);

    public static readonly SubscribableWebhookEventType ReviewReplied = new(Values.ReviewReplied);

    public static readonly SubscribableWebhookEventType BoostStarted = new(Values.BoostStarted);

    public static readonly SubscribableWebhookEventType BoostPaused = new(Values.BoostPaused);

    public static readonly SubscribableWebhookEventType BoostResumed = new(Values.BoostResumed);

    public static readonly SubscribableWebhookEventType BoostStopped = new(Values.BoostStopped);

    public static readonly SubscribableWebhookEventType BoostEnded = new(Values.BoostEnded);

    public static readonly SubscribableWebhookEventType BoostFailed = new(Values.BoostFailed);

    public static readonly SubscribableWebhookEventType BoostUnconfirmed = new(
        Values.BoostUnconfirmed
    );

    public static readonly SubscribableWebhookEventType BoostBudgetReached = new(
        Values.BoostBudgetReached
    );

    public SubscribableWebhookEventType(string value)
    {
        Value = value;
    }

    /// <summary>
    /// The string value of the enum.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a string enum with the given value.
    /// </summary>
    public static SubscribableWebhookEventType FromCustom(string value)
    {
        return new SubscribableWebhookEventType(value);
    }

    public bool Equals(string? other)
    {
        return Value.Equals(other);
    }

    /// <summary>
    /// Returns the string value of the enum.
    /// </summary>
    public override string ToString()
    {
        return Value;
    }

    public static bool operator ==(SubscribableWebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SubscribableWebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SubscribableWebhookEventType value) => value.Value;

    public static explicit operator SubscribableWebhookEventType(string value) => new(value);

    internal class SubscribableWebhookEventTypeSerializer
        : JsonConverter<SubscribableWebhookEventType>
    {
        public override SubscribableWebhookEventType Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON value could not be read as a string."
                );
            return new SubscribableWebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SubscribableWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SubscribableWebhookEventType ReadAsPropertyName(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON property name could not be read as a string."
                );
            return new SubscribableWebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SubscribableWebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Value);
        }
    }

    /// <summary>
    /// Constant strings for enum values
    /// </summary>
    [Serializable]
    public static class Values
    {
        public const string PostScheduled = "post.scheduled";

        public const string PostUnscheduled = "post.unscheduled";

        public const string PostPublished = "post.published";

        public const string PostFailed = "post.failed";

        public const string PostUnconfirmed = "post.unconfirmed";

        public const string PostCancelled = "post.cancelled";

        public const string PostFinished = "post.finished";

        public const string PostUnpublished = "post.unpublished";

        public const string PostUnpublishFailed = "post.unpublish_failed";

        public const string PostEdited = "post.edited";

        public const string PostEditFailed = "post.edit_failed";

        public const string PostApprovalRequested = "post.approval_requested";

        public const string PostApproved = "post.approved";

        public const string PostChangesRequested = "post.changes_requested";

        public const string ChannelConnected = "channel.connected";

        public const string ChannelDisconnected = "channel.disconnected";

        public const string ChannelReconnectNeeded = "channel.reconnect_needed";

        public const string ChannelDisabled = "channel.disabled";

        public const string ChannelEnabled = "channel.enabled";

        public const string ChannelExpiring = "channel.expiring";

        public const string MediaReady = "media.ready";

        public const string MediaFailed = "media.failed";

        public const string CommentReceived = "comment.received";

        public const string CommentReplied = "comment.replied";

        public const string ReviewReceived = "review.received";

        public const string ReviewReplied = "review.replied";

        public const string BoostStarted = "boost.started";

        public const string BoostPaused = "boost.paused";

        public const string BoostResumed = "boost.resumed";

        public const string BoostStopped = "boost.stopped";

        public const string BoostEnded = "boost.ended";

        public const string BoostFailed = "boost.failed";

        public const string BoostUnconfirmed = "boost.unconfirmed";

        public const string BoostBudgetReached = "boost.budget_reached";
    }
}
