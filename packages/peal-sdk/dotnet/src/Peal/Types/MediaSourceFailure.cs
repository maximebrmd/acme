using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MediaSourceFailure.MediaSourceFailureSerializer))]
[Serializable]
public readonly record struct MediaSourceFailure : IStringEnum
{
    public static readonly MediaSourceFailure UnknownHost = new(Values.UnknownHost);

    public static readonly MediaSourceFailure NoAnswer = new(Values.NoAnswer);

    public static readonly MediaSourceFailure BadStatus = new(Values.BadStatus);

    public static readonly MediaSourceFailure TooManyRedirects = new(Values.TooManyRedirects);

    public static readonly MediaSourceFailure TooSlow = new(Values.TooSlow);

    public MediaSourceFailure(string value)
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
    public static MediaSourceFailure FromCustom(string value)
    {
        return new MediaSourceFailure(value);
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

    public static bool operator ==(MediaSourceFailure value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(MediaSourceFailure value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(MediaSourceFailure value) => value.Value;

    public static explicit operator MediaSourceFailure(string value) => new(value);

    internal class MediaSourceFailureSerializer : JsonConverter<MediaSourceFailure>
    {
        public override MediaSourceFailure Read(
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
            return new MediaSourceFailure(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MediaSourceFailure value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MediaSourceFailure ReadAsPropertyName(
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
            return new MediaSourceFailure(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MediaSourceFailure value,
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
        public const string UnknownHost = "unknownHost";

        public const string NoAnswer = "noAnswer";

        public const string BadStatus = "badStatus";

        public const string TooManyRedirects = "tooManyRedirects";

        public const string TooSlow = "tooSlow";
    }
}
