using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhooksNotConfiguredEncodedTag.WebhooksNotConfiguredEncodedTagSerializer))]
[Serializable]
public readonly record struct WebhooksNotConfiguredEncodedTag : IStringEnum
{
    public static readonly WebhooksNotConfiguredEncodedTag WebhooksNotConfigured = new(
        Values.WebhooksNotConfigured
    );

    public WebhooksNotConfiguredEncodedTag(string value)
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
    public static WebhooksNotConfiguredEncodedTag FromCustom(string value)
    {
        return new WebhooksNotConfiguredEncodedTag(value);
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

    public static bool operator ==(WebhooksNotConfiguredEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhooksNotConfiguredEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhooksNotConfiguredEncodedTag value) => value.Value;

    public static explicit operator WebhooksNotConfiguredEncodedTag(string value) => new(value);

    internal class WebhooksNotConfiguredEncodedTagSerializer
        : JsonConverter<WebhooksNotConfiguredEncodedTag>
    {
        public override WebhooksNotConfiguredEncodedTag Read(
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
            return new WebhooksNotConfiguredEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhooksNotConfiguredEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhooksNotConfiguredEncodedTag ReadAsPropertyName(
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
            return new WebhooksNotConfiguredEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhooksNotConfiguredEncodedTag value,
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
        public const string WebhooksNotConfigured = "WebhooksNotConfigured";
    }
}
