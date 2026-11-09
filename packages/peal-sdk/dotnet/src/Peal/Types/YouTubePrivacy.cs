using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(YouTubePrivacy.YouTubePrivacySerializer))]
[Serializable]
public readonly record struct YouTubePrivacy : IStringEnum
{
    public static readonly YouTubePrivacy Public = new(Values.Public);

    public static readonly YouTubePrivacy Unlisted = new(Values.Unlisted);

    public static readonly YouTubePrivacy Private = new(Values.Private);

    public YouTubePrivacy(string value)
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
    public static YouTubePrivacy FromCustom(string value)
    {
        return new YouTubePrivacy(value);
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

    public static bool operator ==(YouTubePrivacy value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(YouTubePrivacy value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(YouTubePrivacy value) => value.Value;

    public static explicit operator YouTubePrivacy(string value) => new(value);

    internal class YouTubePrivacySerializer : JsonConverter<YouTubePrivacy>
    {
        public override YouTubePrivacy Read(
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
            return new YouTubePrivacy(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            YouTubePrivacy value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override YouTubePrivacy ReadAsPropertyName(
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
            return new YouTubePrivacy(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            YouTubePrivacy value,
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
        public const string Public = "public";

        public const string Unlisted = "unlisted";

        public const string Private = "private";
    }
}
