using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MediaKind.MediaKindSerializer))]
[Serializable]
public readonly record struct MediaKind : IStringEnum
{
    public static readonly MediaKind Image = new(Values.Image);

    public static readonly MediaKind Video = new(Values.Video);

    public static readonly MediaKind Document = new(Values.Document);

    public MediaKind(string value)
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
    public static MediaKind FromCustom(string value)
    {
        return new MediaKind(value);
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

    public static bool operator ==(MediaKind value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(MediaKind value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(MediaKind value) => value.Value;

    public static explicit operator MediaKind(string value) => new(value);

    internal class MediaKindSerializer : JsonConverter<MediaKind>
    {
        public override MediaKind Read(
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
            return new MediaKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MediaKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MediaKind ReadAsPropertyName(
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
            return new MediaKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MediaKind value,
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
