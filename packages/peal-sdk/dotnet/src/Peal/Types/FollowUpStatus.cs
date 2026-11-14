using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpStatus.FollowUpStatusSerializer))]
[Serializable]
public readonly record struct FollowUpStatus : IStringEnum
{
    public static readonly FollowUpStatus Armed = new(Values.Armed);

    public static readonly FollowUpStatus Sending = new(Values.Sending);

    public static readonly FollowUpStatus Sent = new(Values.Sent);

    public static readonly FollowUpStatus Failed = new(Values.Failed);

    public static readonly FollowUpStatus Unconfirmed = new(Values.Unconfirmed);

    public static readonly FollowUpStatus Expired = new(Values.Expired);

    public static readonly FollowUpStatus Cancelled = new(Values.Cancelled);

    public FollowUpStatus(string value)
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
    public static FollowUpStatus FromCustom(string value)
    {
        return new FollowUpStatus(value);
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

    public static bool operator ==(FollowUpStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpStatus value) => value.Value;

    public static explicit operator FollowUpStatus(string value) => new(value);

    internal class FollowUpStatusSerializer : JsonConverter<FollowUpStatus>
    {
        public override FollowUpStatus Read(
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
            return new FollowUpStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpStatus ReadAsPropertyName(
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
            return new FollowUpStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpStatus value,
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
        public const string Armed = "armed";

        public const string Sending = "sending";

        public const string Sent = "sent";

        public const string Failed = "failed";

        public const string Unconfirmed = "unconfirmed";

        public const string Expired = "expired";

        public const string Cancelled = "cancelled";
    }
}
