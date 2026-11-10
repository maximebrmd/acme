using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BoostState.BoostStateSerializer))]
[Serializable]
public readonly record struct BoostState : IStringEnum
{
    public static readonly BoostState Requested = new(Values.Requested);

    public static readonly BoostState Active = new(Values.Active);

    public static readonly BoostState Paused = new(Values.Paused);

    public static readonly BoostState Ended = new(Values.Ended);

    public static readonly BoostState Stopped = new(Values.Stopped);

    public static readonly BoostState Failed = new(Values.Failed);

    public static readonly BoostState Unconfirmed = new(Values.Unconfirmed);

    public BoostState(string value)
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
    public static BoostState FromCustom(string value)
    {
        return new BoostState(value);
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

    public static bool operator ==(BoostState value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(BoostState value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BoostState value) => value.Value;

    public static explicit operator BoostState(string value) => new(value);

    internal class BoostStateSerializer : JsonConverter<BoostState>
    {
        public override BoostState Read(
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
            return new BoostState(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BoostState value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BoostState ReadAsPropertyName(
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
            return new BoostState(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BoostState value,
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
        public const string Requested = "requested";

        public const string Active = "active";

        public const string Paused = "paused";

        public const string Ended = "ended";

        public const string Stopped = "stopped";

        public const string Failed = "failed";

        public const string Unconfirmed = "unconfirmed";
    }
}
