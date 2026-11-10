using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdAccountUnsupported.AdAccountUnsupportedSerializer))]
[Serializable]
public readonly record struct AdAccountUnsupported : IStringEnum
{
    public static readonly AdAccountUnsupported TimeZoneUnknown = new(Values.TimeZoneUnknown);

    public AdAccountUnsupported(string value)
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
    public static AdAccountUnsupported FromCustom(string value)
    {
        return new AdAccountUnsupported(value);
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

    public static bool operator ==(AdAccountUnsupported value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdAccountUnsupported value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdAccountUnsupported value) => value.Value;

    public static explicit operator AdAccountUnsupported(string value) => new(value);

    internal class AdAccountUnsupportedSerializer : JsonConverter<AdAccountUnsupported>
    {
        public override AdAccountUnsupported Read(
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
            return new AdAccountUnsupported(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdAccountUnsupported value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdAccountUnsupported ReadAsPropertyName(
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
            return new AdAccountUnsupported(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdAccountUnsupported value,
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
        public const string TimeZoneUnknown = "timeZoneUnknown";
    }
}
