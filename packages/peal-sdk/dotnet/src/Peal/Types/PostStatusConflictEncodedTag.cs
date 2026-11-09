using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostStatusConflictEncodedTag.PostStatusConflictEncodedTagSerializer))]
[Serializable]
public readonly record struct PostStatusConflictEncodedTag : IStringEnum
{
    public static readonly PostStatusConflictEncodedTag PostStatusConflict = new(
        Values.PostStatusConflict
    );

    public PostStatusConflictEncodedTag(string value)
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
    public static PostStatusConflictEncodedTag FromCustom(string value)
    {
        return new PostStatusConflictEncodedTag(value);
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

    public static bool operator ==(PostStatusConflictEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PostStatusConflictEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostStatusConflictEncodedTag value) => value.Value;

    public static explicit operator PostStatusConflictEncodedTag(string value) => new(value);

    internal class PostStatusConflictEncodedTagSerializer
        : JsonConverter<PostStatusConflictEncodedTag>
    {
        public override PostStatusConflictEncodedTag Read(
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
            return new PostStatusConflictEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostStatusConflictEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostStatusConflictEncodedTag ReadAsPropertyName(
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
            return new PostStatusConflictEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostStatusConflictEncodedTag value,
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
        public const string PostStatusConflict = "PostStatusConflict";
    }
}
