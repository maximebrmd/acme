using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ChannelPlatform.ChannelPlatformSerializer))]
[Serializable]
public readonly record struct ChannelPlatform : IStringEnum
{
    public static readonly ChannelPlatform X = new(Values.X);

    public static readonly ChannelPlatform Linkedin = new(Values.Linkedin);

    public static readonly ChannelPlatform Bluesky = new(Values.Bluesky);

    public static readonly ChannelPlatform Mastodon = new(Values.Mastodon);

    public static readonly ChannelPlatform Threads = new(Values.Threads);

    public static readonly ChannelPlatform Instagram = new(Values.Instagram);

    public static readonly ChannelPlatform Facebook = new(Values.Facebook);

    public static readonly ChannelPlatform Tiktok = new(Values.Tiktok);

    public static readonly ChannelPlatform Youtube = new(Values.Youtube);

    public static readonly ChannelPlatform Pinterest = new(Values.Pinterest);

    public static readonly ChannelPlatform GoogleBusiness = new(Values.GoogleBusiness);

    public static readonly ChannelPlatform Wordpress = new(Values.Wordpress);

    public ChannelPlatform(string value)
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
    public static ChannelPlatform FromCustom(string value)
    {
        return new ChannelPlatform(value);
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

    public static bool operator ==(ChannelPlatform value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ChannelPlatform value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ChannelPlatform value) => value.Value;

    public static explicit operator ChannelPlatform(string value) => new(value);

    internal class ChannelPlatformSerializer : JsonConverter<ChannelPlatform>
    {
        public override ChannelPlatform Read(
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
            return new ChannelPlatform(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ChannelPlatform value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ChannelPlatform ReadAsPropertyName(
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
            return new ChannelPlatform(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ChannelPlatform value,
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

        public const string Wordpress = "wordpress";
    }
}
