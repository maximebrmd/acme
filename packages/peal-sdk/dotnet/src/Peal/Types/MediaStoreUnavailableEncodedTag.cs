using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MediaStoreUnavailableEncodedTag.MediaStoreUnavailableEncodedTagSerializer))]
[Serializable]
public readonly record struct MediaStoreUnavailableEncodedTag : IStringEnum
{
    public static readonly MediaStoreUnavailableEncodedTag MediaStoreUnavailable = new(
        Values.MediaStoreUnavailable
    );

    public MediaStoreUnavailableEncodedTag(string value)
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
    public static MediaStoreUnavailableEncodedTag FromCustom(string value)
    {
        return new MediaStoreUnavailableEncodedTag(value);
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

    public static bool operator ==(MediaStoreUnavailableEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(MediaStoreUnavailableEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(MediaStoreUnavailableEncodedTag value) => value.Value;

    public static explicit operator MediaStoreUnavailableEncodedTag(string value) => new(value);

    internal class MediaStoreUnavailableEncodedTagSerializer
        : JsonConverter<MediaStoreUnavailableEncodedTag>
    {
        public override MediaStoreUnavailableEncodedTag Read(
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
            return new MediaStoreUnavailableEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MediaStoreUnavailableEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MediaStoreUnavailableEncodedTag ReadAsPropertyName(
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
            return new MediaStoreUnavailableEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MediaStoreUnavailableEncodedTag value,
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
        public const string MediaStoreUnavailable = "MediaStoreUnavailable";
    }
}
