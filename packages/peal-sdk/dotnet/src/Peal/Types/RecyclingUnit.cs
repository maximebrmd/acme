using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(RecyclingUnit.RecyclingUnitSerializer))]
[Serializable]
public readonly record struct RecyclingUnit : IStringEnum
{
    public static readonly RecyclingUnit Days = new(Values.Days);

    public static readonly RecyclingUnit Weeks = new(Values.Weeks);

    public static readonly RecyclingUnit Months = new(Values.Months);

    public RecyclingUnit(string value)
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
    public static RecyclingUnit FromCustom(string value)
    {
        return new RecyclingUnit(value);
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

    public static bool operator ==(RecyclingUnit value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RecyclingUnit value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RecyclingUnit value) => value.Value;

    public static explicit operator RecyclingUnit(string value) => new(value);

    internal class RecyclingUnitSerializer : JsonConverter<RecyclingUnit>
    {
        public override RecyclingUnit Read(
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
            return new RecyclingUnit(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RecyclingUnit value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RecyclingUnit ReadAsPropertyName(
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
            return new RecyclingUnit(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RecyclingUnit value,
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
        public const string Days = "days";

        public const string Weeks = "weeks";

        public const string Months = "months";
    }
}
