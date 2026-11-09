using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InvalidDateRangeEncodedTag.InvalidDateRangeEncodedTagSerializer))]
[Serializable]
public readonly record struct InvalidDateRangeEncodedTag : IStringEnum
{
    public static readonly InvalidDateRangeEncodedTag InvalidDateRange = new(
        Values.InvalidDateRange
    );

    public InvalidDateRangeEncodedTag(string value)
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
    public static InvalidDateRangeEncodedTag FromCustom(string value)
    {
        return new InvalidDateRangeEncodedTag(value);
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

    public static bool operator ==(InvalidDateRangeEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvalidDateRangeEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvalidDateRangeEncodedTag value) => value.Value;

    public static explicit operator InvalidDateRangeEncodedTag(string value) => new(value);

    internal class InvalidDateRangeEncodedTagSerializer : JsonConverter<InvalidDateRangeEncodedTag>
    {
        public override InvalidDateRangeEncodedTag Read(
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
            return new InvalidDateRangeEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvalidDateRangeEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvalidDateRangeEncodedTag ReadAsPropertyName(
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
            return new InvalidDateRangeEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvalidDateRangeEncodedTag value,
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
        public const string InvalidDateRange = "InvalidDateRange";
    }
}
