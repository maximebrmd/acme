using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TagNameTakenEncodedTag.TagNameTakenEncodedTagSerializer))]
[Serializable]
public readonly record struct TagNameTakenEncodedTag : IStringEnum
{
    public static readonly TagNameTakenEncodedTag TagNameTaken = new(Values.TagNameTaken);

    public TagNameTakenEncodedTag(string value)
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
    public static TagNameTakenEncodedTag FromCustom(string value)
    {
        return new TagNameTakenEncodedTag(value);
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

    public static bool operator ==(TagNameTakenEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TagNameTakenEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TagNameTakenEncodedTag value) => value.Value;

    public static explicit operator TagNameTakenEncodedTag(string value) => new(value);

    internal class TagNameTakenEncodedTagSerializer : JsonConverter<TagNameTakenEncodedTag>
    {
        public override TagNameTakenEncodedTag Read(
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
            return new TagNameTakenEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TagNameTakenEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TagNameTakenEncodedTag ReadAsPropertyName(
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
            return new TagNameTakenEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TagNameTakenEncodedTag value,
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
        public const string TagNameTaken = "TagNameTaken";
    }
}
