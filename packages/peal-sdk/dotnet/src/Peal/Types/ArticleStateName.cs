using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ArticleStateName.ArticleStateNameSerializer))]
[Serializable]
public readonly record struct ArticleStateName : IStringEnum
{
    public static readonly ArticleStateName Draft = new(Values.Draft);

    public static readonly ArticleStateName Scheduled = new(Values.Scheduled);

    public static readonly ArticleStateName Publishing = new(Values.Publishing);

    public static readonly ArticleStateName Published = new(Values.Published);

    public static readonly ArticleStateName Failed = new(Values.Failed);

    public static readonly ArticleStateName Unconfirmed = new(Values.Unconfirmed);

    public ArticleStateName(string value)
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
    public static ArticleStateName FromCustom(string value)
    {
        return new ArticleStateName(value);
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

    public static bool operator ==(ArticleStateName value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ArticleStateName value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ArticleStateName value) => value.Value;

    public static explicit operator ArticleStateName(string value) => new(value);

    internal class ArticleStateNameSerializer : JsonConverter<ArticleStateName>
    {
        public override ArticleStateName Read(
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
            return new ArticleStateName(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ArticleStateName value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ArticleStateName ReadAsPropertyName(
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
            return new ArticleStateName(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ArticleStateName value,
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
        public const string Draft = "draft";

        public const string Scheduled = "scheduled";

        public const string Publishing = "publishing";

        public const string Published = "published";

        public const string Failed = "failed";

        public const string Unconfirmed = "unconfirmed";
    }
}
