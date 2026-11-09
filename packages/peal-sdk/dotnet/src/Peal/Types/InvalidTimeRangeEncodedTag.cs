using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InvalidTimeRangeEncodedTag.InvalidTimeRangeEncodedTagSerializer))]
[Serializable]
public readonly record struct InvalidTimeRangeEncodedTag : IStringEnum
{
    public static readonly InvalidTimeRangeEncodedTag InvalidTimeRange = new(
        Values.InvalidTimeRange
    );

    public InvalidTimeRangeEncodedTag(string value)
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
    public static InvalidTimeRangeEncodedTag FromCustom(string value)
    {
        return new InvalidTimeRangeEncodedTag(value);
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

    public static bool operator ==(InvalidTimeRangeEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvalidTimeRangeEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvalidTimeRangeEncodedTag value) => value.Value;

    public static explicit operator InvalidTimeRangeEncodedTag(string value) => new(value);

    internal class InvalidTimeRangeEncodedTagSerializer : JsonConverter<InvalidTimeRangeEncodedTag>
    {
        public override InvalidTimeRangeEncodedTag Read(
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
            return new InvalidTimeRangeEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvalidTimeRangeEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvalidTimeRangeEncodedTag ReadAsPropertyName(
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
            return new InvalidTimeRangeEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvalidTimeRangeEncodedTag value,
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
        public const string InvalidTimeRange = "InvalidTimeRange";
    }
}
