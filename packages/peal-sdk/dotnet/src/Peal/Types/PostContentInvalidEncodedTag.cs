using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostContentInvalidEncodedTag.PostContentInvalidEncodedTagSerializer))]
[Serializable]
public readonly record struct PostContentInvalidEncodedTag : IStringEnum
{
    public static readonly PostContentInvalidEncodedTag PostContentInvalid = new(
        Values.PostContentInvalid
    );

    public PostContentInvalidEncodedTag(string value)
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
    public static PostContentInvalidEncodedTag FromCustom(string value)
    {
        return new PostContentInvalidEncodedTag(value);
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

    public static bool operator ==(PostContentInvalidEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PostContentInvalidEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostContentInvalidEncodedTag value) => value.Value;

    public static explicit operator PostContentInvalidEncodedTag(string value) => new(value);

    internal class PostContentInvalidEncodedTagSerializer
        : JsonConverter<PostContentInvalidEncodedTag>
    {
        public override PostContentInvalidEncodedTag Read(
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
            return new PostContentInvalidEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostContentInvalidEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostContentInvalidEncodedTag ReadAsPropertyName(
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
            return new PostContentInvalidEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostContentInvalidEncodedTag value,
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
        public const string PostContentInvalid = "PostContentInvalid";
    }
}
