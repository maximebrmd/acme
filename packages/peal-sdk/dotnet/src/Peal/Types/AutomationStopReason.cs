using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AutomationStopReason.AutomationStopReasonSerializer))]
[Serializable]
public readonly record struct AutomationStopReason : IStringEnum
{
    public static readonly AutomationStopReason StarterGone = new(Values.StarterGone);

    public static readonly AutomationStopReason ChannelGone = new(Values.ChannelGone);

    public AutomationStopReason(string value)
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
    public static AutomationStopReason FromCustom(string value)
    {
        return new AutomationStopReason(value);
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

    public static bool operator ==(AutomationStopReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AutomationStopReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AutomationStopReason value) => value.Value;

    public static explicit operator AutomationStopReason(string value) => new(value);

    internal class AutomationStopReasonSerializer : JsonConverter<AutomationStopReason>
    {
        public override AutomationStopReason Read(
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
            return new AutomationStopReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AutomationStopReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AutomationStopReason ReadAsPropertyName(
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
            return new AutomationStopReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AutomationStopReason value,
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
        public const string StarterGone = "starterGone";

        public const string ChannelGone = "channelGone";
    }
}
