using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CommentRuleEndedEncodedTag.CommentRuleEndedEncodedTagSerializer))]
[Serializable]
public readonly record struct CommentRuleEndedEncodedTag : IStringEnum
{
    public static readonly CommentRuleEndedEncodedTag CommentRuleEnded = new(
        Values.CommentRuleEnded
    );

    public CommentRuleEndedEncodedTag(string value)
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
    public static CommentRuleEndedEncodedTag FromCustom(string value)
    {
        return new CommentRuleEndedEncodedTag(value);
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

    public static bool operator ==(CommentRuleEndedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CommentRuleEndedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CommentRuleEndedEncodedTag value) => value.Value;

    public static explicit operator CommentRuleEndedEncodedTag(string value) => new(value);

    internal class CommentRuleEndedEncodedTagSerializer : JsonConverter<CommentRuleEndedEncodedTag>
    {
        public override CommentRuleEndedEncodedTag Read(
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
            return new CommentRuleEndedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CommentRuleEndedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CommentRuleEndedEncodedTag ReadAsPropertyName(
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
            return new CommentRuleEndedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CommentRuleEndedEncodedTag value,
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
        public const string CommentRuleEnded = "CommentRuleEnded";
    }
}
