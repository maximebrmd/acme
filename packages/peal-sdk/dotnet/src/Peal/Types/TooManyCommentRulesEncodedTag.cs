using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TooManyCommentRulesEncodedTag.TooManyCommentRulesEncodedTagSerializer))]
[Serializable]
public readonly record struct TooManyCommentRulesEncodedTag : IStringEnum
{
    public static readonly TooManyCommentRulesEncodedTag TooManyCommentRules = new(
        Values.TooManyCommentRules
    );

    public TooManyCommentRulesEncodedTag(string value)
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
    public static TooManyCommentRulesEncodedTag FromCustom(string value)
    {
        return new TooManyCommentRulesEncodedTag(value);
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

    public static bool operator ==(TooManyCommentRulesEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TooManyCommentRulesEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TooManyCommentRulesEncodedTag value) => value.Value;

    public static explicit operator TooManyCommentRulesEncodedTag(string value) => new(value);

    internal class TooManyCommentRulesEncodedTagSerializer
        : JsonConverter<TooManyCommentRulesEncodedTag>
    {
        public override TooManyCommentRulesEncodedTag Read(
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
            return new TooManyCommentRulesEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TooManyCommentRulesEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TooManyCommentRulesEncodedTag ReadAsPropertyName(
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
            return new TooManyCommentRulesEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TooManyCommentRulesEncodedTag value,
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
        public const string TooManyCommentRules = "TooManyCommentRules";
    }
}
