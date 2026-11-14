using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpNotSentReason.FollowUpNotSentReasonSerializer))]
[Serializable]
public readonly record struct FollowUpNotSentReason : IStringEnum
{
    public static readonly FollowUpNotSentReason Failed = new(Values.Failed);

    public static readonly FollowUpNotSentReason Unconfirmed = new(Values.Unconfirmed);

    public static readonly FollowUpNotSentReason WindowEnded = new(Values.WindowEnded);

    public static readonly FollowUpNotSentReason NotGranted = new(Values.NotGranted);

    public static readonly FollowUpNotSentReason NotApproved = new(Values.NotApproved);

    public FollowUpNotSentReason(string value)
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
    public static FollowUpNotSentReason FromCustom(string value)
    {
        return new FollowUpNotSentReason(value);
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

    public static bool operator ==(FollowUpNotSentReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpNotSentReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpNotSentReason value) => value.Value;

    public static explicit operator FollowUpNotSentReason(string value) => new(value);

    internal class FollowUpNotSentReasonSerializer : JsonConverter<FollowUpNotSentReason>
    {
        public override FollowUpNotSentReason Read(
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
            return new FollowUpNotSentReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpNotSentReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpNotSentReason ReadAsPropertyName(
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
            return new FollowUpNotSentReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpNotSentReason value,
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
        public const string Failed = "failed";

        public const string Unconfirmed = "unconfirmed";

        public const string WindowEnded = "windowEnded";

        public const string NotGranted = "notGranted";

        public const string NotApproved = "notApproved";
    }
}
