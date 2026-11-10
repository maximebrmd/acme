using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookUrlRefusal.WebhookUrlRefusalSerializer))]
[Serializable]
public readonly record struct WebhookUrlRefusal : IStringEnum
{
    public static readonly WebhookUrlRefusal Malformed = new(Values.Malformed);

    public static readonly WebhookUrlRefusal NotHttps = new(Values.NotHttps);

    public static readonly WebhookUrlRefusal Credentials = new(Values.Credentials);

    public static readonly WebhookUrlRefusal TooLong = new(Values.TooLong);

    public static readonly WebhookUrlRefusal NotPublic = new(Values.NotPublic);

    public static readonly WebhookUrlRefusal UnknownHost = new(Values.UnknownHost);

    public WebhookUrlRefusal(string value)
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
    public static WebhookUrlRefusal FromCustom(string value)
    {
        return new WebhookUrlRefusal(value);
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

    public static bool operator ==(WebhookUrlRefusal value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookUrlRefusal value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookUrlRefusal value) => value.Value;

    public static explicit operator WebhookUrlRefusal(string value) => new(value);

    internal class WebhookUrlRefusalSerializer : JsonConverter<WebhookUrlRefusal>
    {
        public override WebhookUrlRefusal Read(
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
            return new WebhookUrlRefusal(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookUrlRefusal value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookUrlRefusal ReadAsPropertyName(
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
            return new WebhookUrlRefusal(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookUrlRefusal value,
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
        public const string Malformed = "malformed";

        public const string NotHttps = "notHttps";

        public const string Credentials = "credentials";

        public const string TooLong = "tooLong";

        public const string NotPublic = "notPublic";

        public const string UnknownHost = "unknownHost";
    }
}
