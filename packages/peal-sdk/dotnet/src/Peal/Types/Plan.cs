using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(Plan.PlanSerializer))]
[Serializable]
public readonly record struct Plan : IStringEnum
{
    public static readonly Plan Free = new(Values.Free);

    public static readonly Plan Pro = new(Values.Pro);

    public static readonly Plan Business = new(Values.Business);

    public Plan(string value)
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
    public static Plan FromCustom(string value)
    {
        return new Plan(value);
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

    public static bool operator ==(Plan value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(Plan value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(Plan value) => value.Value;

    public static explicit operator Plan(string value) => new(value);

    internal class PlanSerializer : JsonConverter<Plan>
    {
        public override Plan Read(
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
            return new Plan(stringValue);
        }

        public override void Write(Utf8JsonWriter writer, Plan value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.Value);
        }

        public override Plan ReadAsPropertyName(
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
            return new Plan(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            Plan value,
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
        public const string Free = "free";

        public const string Pro = "pro";

        public const string Business = "business";
    }
}
