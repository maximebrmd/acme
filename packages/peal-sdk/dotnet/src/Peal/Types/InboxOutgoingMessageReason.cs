using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxOutgoingMessageReason.InboxOutgoingMessageReasonSerializer))]
[Serializable]
public readonly record struct InboxOutgoingMessageReason : IStringEnum
{
    public static readonly InboxOutgoingMessageReason ChannelUnavailable = new(
        Values.ChannelUnavailable
    );

    public static readonly InboxOutgoingMessageReason ReconnectNeeded = new(Values.ReconnectNeeded);

    public static readonly InboxOutgoingMessageReason RateLimited = new(Values.RateLimited);

    public static readonly InboxOutgoingMessageReason PlatformUnavailable = new(
        Values.PlatformUnavailable
    );

    public static readonly InboxOutgoingMessageReason ConversationGone = new(
        Values.ConversationGone
    );

    public static readonly InboxOutgoingMessageReason Refused = new(Values.Refused);

    public static readonly InboxOutgoingMessageReason NotSent = new(Values.NotSent);

    public static readonly InboxOutgoingMessageReason NoResponse = new(Values.NoResponse);

    public static readonly InboxOutgoingMessageReason Interrupted = new(Values.Interrupted);

    public static readonly InboxOutgoingMessageReason AdapterFailure = new(Values.AdapterFailure);

    public InboxOutgoingMessageReason(string value)
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
    public static InboxOutgoingMessageReason FromCustom(string value)
    {
        return new InboxOutgoingMessageReason(value);
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

    public static bool operator ==(InboxOutgoingMessageReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxOutgoingMessageReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxOutgoingMessageReason value) => value.Value;

    public static explicit operator InboxOutgoingMessageReason(string value) => new(value);

    internal class InboxOutgoingMessageReasonSerializer : JsonConverter<InboxOutgoingMessageReason>
    {
        public override InboxOutgoingMessageReason Read(
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
            return new InboxOutgoingMessageReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxOutgoingMessageReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxOutgoingMessageReason ReadAsPropertyName(
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
            return new InboxOutgoingMessageReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxOutgoingMessageReason value,
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

        public const string ConversationGone = "conversationGone";

        public const string Refused = "refused";

        public const string NotSent = "notSent";

        public const string NoResponse = "noResponse";

        public const string Interrupted = "interrupted";

        public const string AdapterFailure = "adapterFailure";
    }
}
