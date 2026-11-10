using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MediaTooLargeEncodedKind.MediaTooLargeEncodedKindSerializer))]
[Serializable]
public readonly record struct MediaTooLargeEncodedKind : IStringEnum
{
    public static readonly MediaTooLargeEncodedKind Image = new(Values.Image);

    public static readonly MediaTooLargeEncodedKind Video = new(Values.Video);

    public static readonly MediaTooLargeEncodedKind Document = new(Values.Document);

    public MediaTooLargeEncodedKind(string value)
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
    public static MediaTooLargeEncodedKind FromCustom(string value)
    {
        return new MediaTooLargeEncodedKind(value);
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

    public static bool operator ==(MediaTooLargeEncodedKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(MediaTooLargeEncodedKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(MediaTooLargeEncodedKind value) => value.Value;

    public static explicit operator MediaTooLargeEncodedKind(string value) => new(value);

    internal class MediaTooLargeEncodedKindSerializer : JsonConverter<MediaTooLargeEncodedKind>
    {
        public override MediaTooLargeEncodedKind Read(
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
            return new MediaTooLargeEncodedKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MediaTooLargeEncodedKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MediaTooLargeEncodedKind ReadAsPropertyName(
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
            return new MediaTooLargeEncodedKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MediaTooLargeEncodedKind value,
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
        public const string Image = "image";

        public const string Video = "video";

        public const string Document = "document";
    }
}
