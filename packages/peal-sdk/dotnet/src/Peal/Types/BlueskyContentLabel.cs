using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BlueskyContentLabel.BlueskyContentLabelSerializer))]
[Serializable]
public readonly record struct BlueskyContentLabel : IStringEnum
{
    public static readonly BlueskyContentLabel Sexual = new(Values.Sexual);

    public static readonly BlueskyContentLabel Nudity = new(Values.Nudity);

    public static readonly BlueskyContentLabel Porn = new(Values.Porn);

    public static readonly BlueskyContentLabel GraphicMedia = new(Values.GraphicMedia);

    public BlueskyContentLabel(string value)
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
    public static BlueskyContentLabel FromCustom(string value)
    {
        return new BlueskyContentLabel(value);
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

    public static bool operator ==(BlueskyContentLabel value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BlueskyContentLabel value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BlueskyContentLabel value) => value.Value;

    public static explicit operator BlueskyContentLabel(string value) => new(value);

    internal class BlueskyContentLabelSerializer : JsonConverter<BlueskyContentLabel>
    {
        public override BlueskyContentLabel Read(
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
            return new BlueskyContentLabel(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BlueskyContentLabel value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BlueskyContentLabel ReadAsPropertyName(
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
            return new BlueskyContentLabel(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BlueskyContentLabel value,
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
        public const string Sexual = "sexual";

        public const string Nudity = "nudity";

        public const string Porn = "porn";

        public const string GraphicMedia = "graphic-media";
    }
}
