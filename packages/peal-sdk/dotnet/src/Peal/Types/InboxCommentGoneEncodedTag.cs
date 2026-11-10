using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxCommentGoneEncodedTag.InboxCommentGoneEncodedTagSerializer))]
[Serializable]
public readonly record struct InboxCommentGoneEncodedTag : IStringEnum
{
    public static readonly InboxCommentGoneEncodedTag InboxCommentGone = new(
        Values.InboxCommentGone
    );

    public InboxCommentGoneEncodedTag(string value)
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
    public static InboxCommentGoneEncodedTag FromCustom(string value)
    {
        return new InboxCommentGoneEncodedTag(value);
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

    public static bool operator ==(InboxCommentGoneEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxCommentGoneEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxCommentGoneEncodedTag value) => value.Value;

    public static explicit operator InboxCommentGoneEncodedTag(string value) => new(value);

    internal class InboxCommentGoneEncodedTagSerializer : JsonConverter<InboxCommentGoneEncodedTag>
    {
        public override InboxCommentGoneEncodedTag Read(
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
            return new InboxCommentGoneEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxCommentGoneEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxCommentGoneEncodedTag ReadAsPropertyName(
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
            return new InboxCommentGoneEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxCommentGoneEncodedTag value,
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
        public const string InboxCommentGone = "InboxCommentGone";
    }
}
