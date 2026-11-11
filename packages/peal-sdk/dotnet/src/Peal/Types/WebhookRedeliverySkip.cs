using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookRedeliverySkip.WebhookRedeliverySkipSerializer))]
[Serializable]
public readonly record struct WebhookRedeliverySkip : IStringEnum
{
    public static readonly WebhookRedeliverySkip AlreadySent = new(Values.AlreadySent);

    public static readonly WebhookRedeliverySkip EndpointDisabled = new(Values.EndpointDisabled);

    public static readonly WebhookRedeliverySkip NotFound = new(Values.NotFound);

    public WebhookRedeliverySkip(string value)
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
    public static WebhookRedeliverySkip FromCustom(string value)
    {
        return new WebhookRedeliverySkip(value);
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

    public static bool operator ==(WebhookRedeliverySkip value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookRedeliverySkip value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookRedeliverySkip value) => value.Value;

    public static explicit operator WebhookRedeliverySkip(string value) => new(value);

    internal class WebhookRedeliverySkipSerializer : JsonConverter<WebhookRedeliverySkip>
    {
        public override WebhookRedeliverySkip Read(
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
            return new WebhookRedeliverySkip(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookRedeliverySkip value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookRedeliverySkip ReadAsPropertyName(
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
            return new WebhookRedeliverySkip(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookRedeliverySkip value,
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
        public const string AlreadySent = "alreadySent";

        public const string EndpointDisabled = "endpointDisabled";

        public const string NotFound = "notFound";
    }
}
