using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SitePlatform.SitePlatformSerializer))]
[Serializable]
public readonly record struct SitePlatform : IStringEnum
{
    public static readonly SitePlatform Wordpress = new(Values.Wordpress);

    public SitePlatform(string value)
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
    public static SitePlatform FromCustom(string value)
    {
        return new SitePlatform(value);
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

    public static bool operator ==(SitePlatform value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SitePlatform value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SitePlatform value) => value.Value;

    public static explicit operator SitePlatform(string value) => new(value);

    internal class SitePlatformSerializer : JsonConverter<SitePlatform>
    {
        public override SitePlatform Read(
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
            return new SitePlatform(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SitePlatform value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SitePlatform ReadAsPropertyName(
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
            return new SitePlatform(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SitePlatform value,
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
        public const string Wordpress = "wordpress";
    }
}
