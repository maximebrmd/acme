using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ArticleSiteStatus.ArticleSiteStatusSerializer))]
[Serializable]
public readonly record struct ArticleSiteStatus : IStringEnum
{
    public static readonly ArticleSiteStatus Publish = new(Values.Publish);

    public static readonly ArticleSiteStatus Draft = new(Values.Draft);

    public static readonly ArticleSiteStatus Future = new(Values.Future);

    public ArticleSiteStatus(string value)
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
    public static ArticleSiteStatus FromCustom(string value)
    {
        return new ArticleSiteStatus(value);
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

    public static bool operator ==(ArticleSiteStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ArticleSiteStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ArticleSiteStatus value) => value.Value;

    public static explicit operator ArticleSiteStatus(string value) => new(value);

    internal class ArticleSiteStatusSerializer : JsonConverter<ArticleSiteStatus>
    {
        public override ArticleSiteStatus Read(
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
            return new ArticleSiteStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ArticleSiteStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ArticleSiteStatus ReadAsPropertyName(
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
            return new ArticleSiteStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ArticleSiteStatus value,
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
        public const string Publish = "publish";

        public const string Draft = "draft";

        public const string Future = "future";
    }
}
