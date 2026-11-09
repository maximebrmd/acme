using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TextUnit.TextUnitSerializer))]
[Serializable]
public readonly record struct TextUnit : IStringEnum
{
    public static readonly TextUnit Graphemes = new(Values.Graphemes);

    public static readonly TextUnit CodePoints = new(Values.CodePoints);

    public static readonly TextUnit Utf8Bytes = new(Values.Utf8Bytes);

    public static readonly TextUnit EmojiBytes = new(Values.EmojiBytes);

    public static readonly TextUnit Utf16Units = new(Values.Utf16Units);

    public static readonly TextUnit Weighted = new(Values.Weighted);

    public TextUnit(string value)
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
    public static TextUnit FromCustom(string value)
    {
        return new TextUnit(value);
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

    public static bool operator ==(TextUnit value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(TextUnit value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(TextUnit value) => value.Value;

    public static explicit operator TextUnit(string value) => new(value);

    internal class TextUnitSerializer : JsonConverter<TextUnit>
    {
        public override TextUnit Read(
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
            return new TextUnit(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TextUnit value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TextUnit ReadAsPropertyName(
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
            return new TextUnit(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TextUnit value,
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
        public const string Graphemes = "graphemes";

        public const string CodePoints = "codePoints";

        public const string Utf8Bytes = "utf8Bytes";

        public const string EmojiBytes = "emojiBytes";

        public const string Utf16Units = "utf16Units";

        public const string Weighted = "weighted";
    }
}
