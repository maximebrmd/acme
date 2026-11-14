using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxReviewReplyReason.InboxReviewReplyReasonSerializer))]
[Serializable]
public readonly record struct InboxReviewReplyReason : IStringEnum
{
    public static readonly InboxReviewReplyReason ChannelUnavailable = new(
        Values.ChannelUnavailable
    );

    public static readonly InboxReviewReplyReason ReconnectNeeded = new(Values.ReconnectNeeded);

    public static readonly InboxReviewReplyReason RateLimited = new(Values.RateLimited);

    public static readonly InboxReviewReplyReason PlatformUnavailable = new(
        Values.PlatformUnavailable
    );

    public static readonly InboxReviewReplyReason ReviewGone = new(Values.ReviewGone);

    public static readonly InboxReviewReplyReason Refused = new(Values.Refused);

    public static readonly InboxReviewReplyReason NotSent = new(Values.NotSent);

    public static readonly InboxReviewReplyReason NoResponse = new(Values.NoResponse);

    public static readonly InboxReviewReplyReason Interrupted = new(Values.Interrupted);

    public static readonly InboxReviewReplyReason AdapterFailure = new(Values.AdapterFailure);

    public InboxReviewReplyReason(string value)
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
    public static InboxReviewReplyReason FromCustom(string value)
    {
        return new InboxReviewReplyReason(value);
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

    public static bool operator ==(InboxReviewReplyReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxReviewReplyReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxReviewReplyReason value) => value.Value;

    public static explicit operator InboxReviewReplyReason(string value) => new(value);

    internal class InboxReviewReplyReasonSerializer : JsonConverter<InboxReviewReplyReason>
    {
        public override InboxReviewReplyReason Read(
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
            return new InboxReviewReplyReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxReviewReplyReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxReviewReplyReason ReadAsPropertyName(
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
            return new InboxReviewReplyReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxReviewReplyReason value,
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
        public const string ChannelUnavailable = "channelUnavailable";

        public const string ReconnectNeeded = "reconnectNeeded";

        public const string RateLimited = "rateLimited";

        public const string PlatformUnavailable = "platformUnavailable";

        public const string ReviewGone = "reviewGone";

        public const string Refused = "refused";

        public const string NotSent = "notSent";

        public const string NoResponse = "noResponse";

        public const string Interrupted = "interrupted";

        public const string AdapterFailure = "adapterFailure";
    }
}
