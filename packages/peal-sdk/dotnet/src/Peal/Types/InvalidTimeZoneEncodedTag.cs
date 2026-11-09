using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InvalidTimeZoneEncodedTag.InvalidTimeZoneEncodedTagSerializer))]
[Serializable]
public readonly record struct InvalidTimeZoneEncodedTag : IStringEnum
{
    public static readonly InvalidTimeZoneEncodedTag InvalidTimeZone = new(Values.InvalidTimeZone);

    public InvalidTimeZoneEncodedTag(string value)
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
    public static InvalidTimeZoneEncodedTag FromCustom(string value)
    {
        return new InvalidTimeZoneEncodedTag(value);
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

    public static bool operator ==(InvalidTimeZoneEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InvalidTimeZoneEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InvalidTimeZoneEncodedTag value) => value.Value;

    public static explicit operator InvalidTimeZoneEncodedTag(string value) => new(value);

    internal class InvalidTimeZoneEncodedTagSerializer : JsonConverter<InvalidTimeZoneEncodedTag>
    {
        public override InvalidTimeZoneEncodedTag Read(
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
            return new InvalidTimeZoneEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InvalidTimeZoneEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InvalidTimeZoneEncodedTag ReadAsPropertyName(
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
            return new InvalidTimeZoneEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InvalidTimeZoneEncodedTag value,
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
        public const string InvalidTimeZone = "InvalidTimeZone";
    }
}
