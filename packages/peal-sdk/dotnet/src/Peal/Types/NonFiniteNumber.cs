using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(NonFiniteNumber.NonFiniteNumberSerializer))]
[Serializable]
public readonly record struct NonFiniteNumber : IStringEnum
{
    public static readonly NonFiniteNumber Infinity = new(Values.Infinity);

    public static readonly NonFiniteNumber NaN = new(Values.NaN);

    public NonFiniteNumber(string value)
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
    public static NonFiniteNumber FromCustom(string value)
    {
        return new NonFiniteNumber(value);
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

    public static bool operator ==(NonFiniteNumber value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(NonFiniteNumber value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(NonFiniteNumber value) => value.Value;

    public static explicit operator NonFiniteNumber(string value) => new(value);

    internal class NonFiniteNumberSerializer : JsonConverter<NonFiniteNumber>
    {
        public override NonFiniteNumber Read(
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
            return new NonFiniteNumber(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            NonFiniteNumber value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override NonFiniteNumber ReadAsPropertyName(
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
            return new NonFiniteNumber(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            NonFiniteNumber value,
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
        public const string Infinity = "Infinity";

        public const string NaN = "NaN";
    }
}
