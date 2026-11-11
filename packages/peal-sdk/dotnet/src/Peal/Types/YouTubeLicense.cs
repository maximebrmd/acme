using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(YouTubeLicense.YouTubeLicenseSerializer))]
[Serializable]
public readonly record struct YouTubeLicense : IStringEnum
{
    public static readonly YouTubeLicense Youtube = new(Values.Youtube);

    public static readonly YouTubeLicense CreativeCommon = new(Values.CreativeCommon);

    public YouTubeLicense(string value)
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
    public static YouTubeLicense FromCustom(string value)
    {
        return new YouTubeLicense(value);
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

    public static bool operator ==(YouTubeLicense value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(YouTubeLicense value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(YouTubeLicense value) => value.Value;

    public static explicit operator YouTubeLicense(string value) => new(value);

    internal class YouTubeLicenseSerializer : JsonConverter<YouTubeLicense>
    {
        public override YouTubeLicense Read(
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
            return new YouTubeLicense(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            YouTubeLicense value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override YouTubeLicense ReadAsPropertyName(
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
            return new YouTubeLicense(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            YouTubeLicense value,
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
        public const string Youtube = "youtube";

        public const string CreativeCommon = "creativeCommon";
    }
}
