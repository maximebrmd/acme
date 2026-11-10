using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TagColour.TagColourSerializer))]
[Serializable]
public readonly record struct TagColour : IStringEnum
{
    public static readonly TagColour Gray = new(Values.Gray);

    public static readonly TagColour Red = new(Values.Red);

    public static readonly TagColour Orange = new(Values.Orange);

    public static readonly TagColour Amber = new(Values.Amber);

    public static readonly TagColour Green = new(Values.Green);

    public static readonly TagColour Teal = new(Values.Teal);

    public static readonly TagColour Blue = new(Values.Blue);

    public static readonly TagColour Purple = new(Values.Purple);

    public static readonly TagColour Pink = new(Values.Pink);

    public TagColour(string value)
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
    public static TagColour FromCustom(string value)
    {
        return new TagColour(value);
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

    public static bool operator ==(TagColour value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(TagColour value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(TagColour value) => value.Value;

    public static explicit operator TagColour(string value) => new(value);

    internal class TagColourSerializer : JsonConverter<TagColour>
    {
        public override TagColour Read(
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
            return new TagColour(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TagColour value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TagColour ReadAsPropertyName(
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
            return new TagColour(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TagColour value,
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
        public const string Gray = "gray";

        public const string Red = "red";

        public const string Orange = "orange";

        public const string Amber = "amber";

        public const string Green = "green";

        public const string Teal = "teal";

        public const string Blue = "blue";

        public const string Purple = "purple";

        public const string Pink = "pink";
    }
}
