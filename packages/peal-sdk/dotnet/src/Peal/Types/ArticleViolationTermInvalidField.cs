using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ArticleViolationTermInvalidField.ArticleViolationTermInvalidFieldSerializer))]
[Serializable]
public readonly record struct ArticleViolationTermInvalidField : IStringEnum
{
    public static readonly ArticleViolationTermInvalidField Categories = new(Values.Categories);

    public static readonly ArticleViolationTermInvalidField Tags = new(Values.Tags);

    public ArticleViolationTermInvalidField(string value)
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
    public static ArticleViolationTermInvalidField FromCustom(string value)
    {
        return new ArticleViolationTermInvalidField(value);
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

    public static bool operator ==(ArticleViolationTermInvalidField value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ArticleViolationTermInvalidField value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ArticleViolationTermInvalidField value) => value.Value;

    public static explicit operator ArticleViolationTermInvalidField(string value) => new(value);

    internal class ArticleViolationTermInvalidFieldSerializer
        : JsonConverter<ArticleViolationTermInvalidField>
    {
        public override ArticleViolationTermInvalidField Read(
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
            return new ArticleViolationTermInvalidField(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ArticleViolationTermInvalidField value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ArticleViolationTermInvalidField ReadAsPropertyName(
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
            return new ArticleViolationTermInvalidField(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ArticleViolationTermInvalidField value,
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
        public const string Categories = "categories";

        public const string Tags = "tags";
    }
}
