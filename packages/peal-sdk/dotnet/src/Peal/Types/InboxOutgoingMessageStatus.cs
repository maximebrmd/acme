using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxOutgoingMessageStatus.InboxOutgoingMessageStatusSerializer))]
[Serializable]
public readonly record struct InboxOutgoingMessageStatus : IStringEnum
{
    public static readonly InboxOutgoingMessageStatus Sending = new(Values.Sending);

    public static readonly InboxOutgoingMessageStatus Sent = new(Values.Sent);

    public static readonly InboxOutgoingMessageStatus Failed = new(Values.Failed);

    public static readonly InboxOutgoingMessageStatus Unconfirmed = new(Values.Unconfirmed);

    public InboxOutgoingMessageStatus(string value)
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
    public static InboxOutgoingMessageStatus FromCustom(string value)
    {
        return new InboxOutgoingMessageStatus(value);
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

    public static bool operator ==(InboxOutgoingMessageStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxOutgoingMessageStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxOutgoingMessageStatus value) => value.Value;

    public static explicit operator InboxOutgoingMessageStatus(string value) => new(value);

    internal class InboxOutgoingMessageStatusSerializer : JsonConverter<InboxOutgoingMessageStatus>
    {
        public override InboxOutgoingMessageStatus Read(
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
            return new InboxOutgoingMessageStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxOutgoingMessageStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxOutgoingMessageStatus ReadAsPropertyName(
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
            return new InboxOutgoingMessageStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxOutgoingMessageStatus value,
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
        public const string Sending = "sending";

        public const string Sent = "sent";

        public const string Failed = "failed";

        public const string Unconfirmed = "unconfirmed";
    }
}
