using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpEndReason.FollowUpEndReasonSerializer))]
[Serializable]
public readonly record struct FollowUpEndReason : IStringEnum
{
    public static readonly FollowUpEndReason Stopped = new(Values.Stopped);

    public static readonly FollowUpEndReason Completed = new(Values.Completed);

    public static readonly FollowUpEndReason StarterGone = new(Values.StarterGone);

    public static readonly FollowUpEndReason ChannelGone = new(Values.ChannelGone);

    public FollowUpEndReason(string value)
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
    public static FollowUpEndReason FromCustom(string value)
    {
        return new FollowUpEndReason(value);
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

    public static bool operator ==(FollowUpEndReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpEndReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpEndReason value) => value.Value;

    public static explicit operator FollowUpEndReason(string value) => new(value);

    internal class FollowUpEndReasonSerializer : JsonConverter<FollowUpEndReason>
    {
        public override FollowUpEndReason Read(
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
            return new FollowUpEndReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpEndReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpEndReason ReadAsPropertyName(
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
            return new FollowUpEndReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpEndReason value,
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
        public const string Stopped = "stopped";

        public const string Completed = "completed";

        public const string StarterGone = "starterGone";

        public const string ChannelGone = "channelGone";
    }
}
