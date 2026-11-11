using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookEventType.WebhookEventTypeSerializer))]
[Serializable]
public readonly record struct WebhookEventType : IStringEnum
{
    public static readonly WebhookEventType PostScheduled = new(Values.PostScheduled);

    public static readonly WebhookEventType PostUnscheduled = new(Values.PostUnscheduled);

    public static readonly WebhookEventType PostPublished = new(Values.PostPublished);

    public static readonly WebhookEventType PostFailed = new(Values.PostFailed);

    public static readonly WebhookEventType PostUnconfirmed = new(Values.PostUnconfirmed);

    public static readonly WebhookEventType PostCancelled = new(Values.PostCancelled);

    public static readonly WebhookEventType PostUnpublished = new(Values.PostUnpublished);

    public static readonly WebhookEventType PostUnpublishFailed = new(Values.PostUnpublishFailed);

    public static readonly WebhookEventType PostApprovalRequested = new(
        Values.PostApprovalRequested
    );

    public static readonly WebhookEventType PostApproved = new(Values.PostApproved);

    public static readonly WebhookEventType PostChangesRequested = new(Values.PostChangesRequested);

    public static readonly WebhookEventType ChannelConnected = new(Values.ChannelConnected);

    public static readonly WebhookEventType ChannelDisconnected = new(Values.ChannelDisconnected);

    public static readonly WebhookEventType ChannelReconnectNeeded = new(
        Values.ChannelReconnectNeeded
    );

    public static readonly WebhookEventType MediaReady = new(Values.MediaReady);

    public static readonly WebhookEventType MediaFailed = new(Values.MediaFailed);

    public static readonly WebhookEventType CommentReceived = new(Values.CommentReceived);

    public static readonly WebhookEventType CommentReplied = new(Values.CommentReplied);

    public static readonly WebhookEventType BoostStarted = new(Values.BoostStarted);

    public static readonly WebhookEventType BoostPaused = new(Values.BoostPaused);

    public static readonly WebhookEventType BoostResumed = new(Values.BoostResumed);

    public static readonly WebhookEventType BoostStopped = new(Values.BoostStopped);

    public static readonly WebhookEventType BoostEnded = new(Values.BoostEnded);

    public static readonly WebhookEventType BoostFailed = new(Values.BoostFailed);

    public static readonly WebhookEventType BoostUnconfirmed = new(Values.BoostUnconfirmed);

    public static readonly WebhookEventType BoostBudgetReached = new(Values.BoostBudgetReached);

    public static readonly WebhookEventType WebhookTest = new(Values.WebhookTest);

    public WebhookEventType(string value)
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
    public static WebhookEventType FromCustom(string value)
    {
        return new WebhookEventType(value);
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

    public static bool operator ==(WebhookEventType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookEventType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookEventType value) => value.Value;

    public static explicit operator WebhookEventType(string value) => new(value);

    internal class WebhookEventTypeSerializer : JsonConverter<WebhookEventType>
    {
        public override WebhookEventType Read(
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
            return new WebhookEventType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookEventType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookEventType ReadAsPropertyName(
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
            return new WebhookEventType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookEventType value,
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

        public const string PostUnpublished = "post.unpublished";

        public const string PostUnpublishFailed = "post.unpublish_failed";

        public const string PostApprovalRequested = "post.approval_requested";

        public const string PostApproved = "post.approved";

        public const string PostChangesRequested = "post.changes_requested";

        public const string ChannelConnected = "channel.connected";

        public const string ChannelDisconnected = "channel.disconnected";

        public const string ChannelReconnectNeeded = "channel.reconnect_needed";

        public const string MediaReady = "media.ready";

        public const string MediaFailed = "media.failed";

        public const string CommentReceived = "comment.received";

        public const string CommentReplied = "comment.replied";

        public const string BoostStarted = "boost.started";

        public const string BoostPaused = "boost.paused";

        public const string BoostResumed = "boost.resumed";

        public const string BoostStopped = "boost.stopped";

        public const string BoostEnded = "boost.ended";

        public const string BoostFailed = "boost.failed";

        public const string BoostUnconfirmed = "boost.unconfirmed";

        public const string BoostBudgetReached = "boost.budget_reached";

        public const string WebhookTest = "webhook.test";
    }
}
