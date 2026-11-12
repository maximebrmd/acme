using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ImageAspect.ImageAspectSerializer))]
[Serializable]
public readonly record struct ImageAspect : IStringEnum
{
    public static readonly ImageAspect Square = new(Values.Square);

    public static readonly ImageAspect Landscape = new(Values.Landscape);

    public static readonly ImageAspect Portrait = new(Values.Portrait);

    public ImageAspect(string value)
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
    public static ImageAspect FromCustom(string value)
    {
        return new ImageAspect(value);
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

    public static bool operator ==(ImageAspect value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ImageAspect value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ImageAspect value) => value.Value;

    public static explicit operator ImageAspect(string value) => new(value);

    internal class ImageAspectSerializer : JsonConverter<ImageAspect>
    {
        public override ImageAspect Read(
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
            return new ImageAspect(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImageAspect value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ImageAspect ReadAsPropertyName(
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
            return new ImageAspect(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImageAspect value,
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
        public const string Square = "square";

        public const string Landscape = "landscape";

        public const string Portrait = "portrait";
    }
}
