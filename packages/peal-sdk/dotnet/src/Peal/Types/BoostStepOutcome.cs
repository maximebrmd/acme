using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BoostStepOutcome.BoostStepOutcomeSerializer))]
[Serializable]
public readonly record struct BoostStepOutcome : IStringEnum
{
    public static readonly BoostStepOutcome Done = new(Values.Done);

    public static readonly BoostStepOutcome Refused = new(Values.Refused);

    public static readonly BoostStepOutcome Found = new(Values.Found);

    public static readonly BoostStepOutcome Absent = new(Values.Absent);

    public static readonly BoostStepOutcome Unknown = new(Values.Unknown);

    public BoostStepOutcome(string value)
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
    public static BoostStepOutcome FromCustom(string value)
    {
        return new BoostStepOutcome(value);
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

    public static bool operator ==(BoostStepOutcome value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BoostStepOutcome value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BoostStepOutcome value) => value.Value;

    public static explicit operator BoostStepOutcome(string value) => new(value);

    internal class BoostStepOutcomeSerializer : JsonConverter<BoostStepOutcome>
    {
        public override BoostStepOutcome Read(
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
            return new BoostStepOutcome(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BoostStepOutcome value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BoostStepOutcome ReadAsPropertyName(
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
            return new BoostStepOutcome(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BoostStepOutcome value,
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
        public const string Done = "done";

        public const string Refused = "refused";

        public const string Found = "found";

        public const string Absent = "absent";

        public const string Unknown = "unknown";
    }
}
