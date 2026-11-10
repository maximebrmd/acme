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

    public static readonly SubscribableWebhookEventType MediaReady = new(Values.MediaReady);

    public static readonly SubscribableWebhookEventType MediaFailed = new(Values.MediaFailed);

    public static readonly SubscribableWebhookEventType CommentReceived = new(
        Values.CommentReceived
    );

    public static readonly SubscribableWebhookEventType CommentReplied = new(Values.CommentReplied);

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
    }
}
