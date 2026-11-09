using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ProbeState.ProbeStateSerializer))]
[Serializable]
public readonly record struct ProbeState : IStringEnum
{
    public static readonly ProbeState Pending = new(Values.Pending);

    public static readonly ProbeState Unavailable = new(Values.Unavailable);

    public static readonly ProbeState Unreadable = new(Values.Unreadable);

    public static readonly ProbeState TimedOut = new(Values.TimedOut);

    public static readonly ProbeState TooLarge = new(Values.TooLarge);

    public static readonly ProbeState ToolFailed = new(Values.ToolFailed);

    public ProbeState(string value)
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
    public static ProbeState FromCustom(string value)
    {
        return new ProbeState(value);
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

    public static bool operator ==(ProbeState value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(ProbeState value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ProbeState value) => value.Value;

    public static explicit operator ProbeState(string value) => new(value);

    internal class ProbeStateSerializer : JsonConverter<ProbeState>
    {
        public override ProbeState Read(
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
            return new ProbeState(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ProbeState value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ProbeState ReadAsPropertyName(
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
            return new ProbeState(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ProbeState value,
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
        public const string Pending = "pending";

        public const string Unavailable = "unavailable";

        public const string Unreadable = "unreadable";

        public const string TimedOut = "timedOut";

        public const string TooLarge = "tooLarge";

        public const string ToolFailed = "toolFailed";
    }
}
