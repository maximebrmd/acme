using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(Platform.PlatformSerializer))]
[Serializable]
public readonly record struct Platform : IStringEnum
{
    public static readonly Platform X = new(Values.X);

    public static readonly Platform Linkedin = new(Values.Linkedin);

    public static readonly Platform Bluesky = new(Values.Bluesky);

    public static readonly Platform Mastodon = new(Values.Mastodon);

    public static readonly Platform Threads = new(Values.Threads);

    public static readonly Platform Instagram = new(Values.Instagram);

    public static readonly Platform Facebook = new(Values.Facebook);

    public static readonly Platform Tiktok = new(Values.Tiktok);

    public static readonly Platform Youtube = new(Values.Youtube);

    public static readonly Platform Pinterest = new(Values.Pinterest);

    public static readonly Platform GoogleBusiness = new(Values.GoogleBusiness);

    public Platform(string value)
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
    public static Platform FromCustom(string value)
    {
        return new Platform(value);
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

    public static bool operator ==(Platform value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(Platform value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(Platform value) => value.Value;

    public static explicit operator Platform(string value) => new(value);

    internal class PlatformSerializer : JsonConverter<Platform>
    {
        public override Platform Read(
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
            return new Platform(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            Platform value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override Platform ReadAsPropertyName(
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
            return new Platform(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            Platform value,
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
        public const string X = "x";

        public const string Linkedin = "linkedin";

        public const string Bluesky = "bluesky";

        public const string Mastodon = "mastodon";

        public const string Threads = "threads";

        public const string Instagram = "instagram";

        public const string Facebook = "facebook";

        public const string Tiktok = "tiktok";

        public const string Youtube = "youtube";

        public const string Pinterest = "pinterest";

        public const string GoogleBusiness = "googleBusiness";
    }
}
