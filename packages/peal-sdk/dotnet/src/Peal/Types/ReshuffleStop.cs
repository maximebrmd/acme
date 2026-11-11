using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ReshuffleStop.ReshuffleStopSerializer))]
[Serializable]
public readonly record struct ReshuffleStop : IStringEnum
{
    public static readonly ReshuffleStop PlanLimit = new(Values.PlanLimit);

    public static readonly ReshuffleStop Full = new(Values.Full);

    public static readonly ReshuffleStop Changed = new(Values.Changed);

    public ReshuffleStop(string value)
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
    public static ReshuffleStop FromCustom(string value)
    {
        return new ReshuffleStop(value);
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

    public static bool operator ==(ReshuffleStop value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReshuffleStop value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReshuffleStop value) => value.Value;

    public static explicit operator ReshuffleStop(string value) => new(value);

    internal class ReshuffleStopSerializer : JsonConverter<ReshuffleStop>
    {
        public override ReshuffleStop Read(
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
            return new ReshuffleStop(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReshuffleStop value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReshuffleStop ReadAsPropertyName(
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
            return new ReshuffleStop(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReshuffleStop value,
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
        public const string PlanLimit = "planLimit";

        public const string Full = "full";

        public const string Changed = "changed";
    }
}
