using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UnknownTagsEncodedTag.UnknownTagsEncodedTagSerializer))]
[Serializable]
public readonly record struct UnknownTagsEncodedTag : IStringEnum
{
    public static readonly UnknownTagsEncodedTag UnknownTags = new(Values.UnknownTags);

    public UnknownTagsEncodedTag(string value)
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
    public static UnknownTagsEncodedTag FromCustom(string value)
    {
        return new UnknownTagsEncodedTag(value);
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

    public static bool operator ==(UnknownTagsEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UnknownTagsEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UnknownTagsEncodedTag value) => value.Value;

    public static explicit operator UnknownTagsEncodedTag(string value) => new(value);

    internal class UnknownTagsEncodedTagSerializer : JsonConverter<UnknownTagsEncodedTag>
    {
        public override UnknownTagsEncodedTag Read(
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
            return new UnknownTagsEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UnknownTagsEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UnknownTagsEncodedTag ReadAsPropertyName(
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
            return new UnknownTagsEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UnknownTagsEncodedTag value,
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
        public const string UnknownTags = "UnknownTags";
    }
}
