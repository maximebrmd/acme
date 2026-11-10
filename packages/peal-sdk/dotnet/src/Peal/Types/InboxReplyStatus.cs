using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxReplyStatus.InboxReplyStatusSerializer))]
[Serializable]
public readonly record struct InboxReplyStatus : IStringEnum
{
    public static readonly InboxReplyStatus Sending = new(Values.Sending);

    public static readonly InboxReplyStatus Sent = new(Values.Sent);

    public static readonly InboxReplyStatus Failed = new(Values.Failed);

    public static readonly InboxReplyStatus Unconfirmed = new(Values.Unconfirmed);

    public static readonly InboxReplyStatus Withdrawn = new(Values.Withdrawn);

    public InboxReplyStatus(string value)
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
    public static InboxReplyStatus FromCustom(string value)
    {
        return new InboxReplyStatus(value);
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

    public static bool operator ==(InboxReplyStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxReplyStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxReplyStatus value) => value.Value;

    public static explicit operator InboxReplyStatus(string value) => new(value);

    internal class InboxReplyStatusSerializer : JsonConverter<InboxReplyStatus>
    {
        public override InboxReplyStatus Read(
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
            return new InboxReplyStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxReplyStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxReplyStatus ReadAsPropertyName(
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
            return new InboxReplyStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxReplyStatus value,
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

        public const string Withdrawn = "withdrawn";
    }
}
