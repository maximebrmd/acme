using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MediaContentType.MediaContentTypeSerializer))]
[Serializable]
public readonly record struct MediaContentType : IStringEnum
{
    public static readonly MediaContentType ImageGif = new(Values.ImageGif);

    public static readonly MediaContentType ImageJpeg = new(Values.ImageJpeg);

    public static readonly MediaContentType ImagePng = new(Values.ImagePng);

    public static readonly MediaContentType ImageWebp = new(Values.ImageWebp);

    public static readonly MediaContentType VideoMp4 = new(Values.VideoMp4);

    public static readonly MediaContentType VideoQuicktime = new(Values.VideoQuicktime);

    public static readonly MediaContentType ApplicationPdf = new(Values.ApplicationPdf);

    public MediaContentType(string value)
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
    public static MediaContentType FromCustom(string value)
    {
        return new MediaContentType(value);
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

    public static bool operator ==(MediaContentType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(MediaContentType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(MediaContentType value) => value.Value;

    public static explicit operator MediaContentType(string value) => new(value);

    internal class MediaContentTypeSerializer : JsonConverter<MediaContentType>
    {
        public override MediaContentType Read(
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
            return new MediaContentType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MediaContentType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MediaContentType ReadAsPropertyName(
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
            return new MediaContentType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MediaContentType value,
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
        public const string ImageGif = "image/gif";

        public const string ImageJpeg = "image/jpeg";

        public const string ImagePng = "image/png";

        public const string ImageWebp = "image/webp";

        public const string VideoMp4 = "video/mp4";

        public const string VideoQuicktime = "video/quicktime";

        public const string ApplicationPdf = "application/pdf";
    }
}
