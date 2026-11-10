using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookDeliveryFailure.WebhookDeliveryFailureSerializer))]
[Serializable]
public readonly record struct WebhookDeliveryFailure : IStringEnum
{
    public static readonly WebhookDeliveryFailure Exhausted = new(Values.Exhausted);

    public static readonly WebhookDeliveryFailure Gone = new(Values.Gone);

    public static readonly WebhookDeliveryFailure EndpointDisabled = new(Values.EndpointDisabled);

    public static readonly WebhookDeliveryFailure NotConfigured = new(Values.NotConfigured);

    public WebhookDeliveryFailure(string value)
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
    public static WebhookDeliveryFailure FromCustom(string value)
    {
        return new WebhookDeliveryFailure(value);
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

    public static bool operator ==(WebhookDeliveryFailure value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookDeliveryFailure value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookDeliveryFailure value) => value.Value;

    public static explicit operator WebhookDeliveryFailure(string value) => new(value);

    internal class WebhookDeliveryFailureSerializer : JsonConverter<WebhookDeliveryFailure>
    {
        public override WebhookDeliveryFailure Read(
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
            return new WebhookDeliveryFailure(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookDeliveryFailure value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookDeliveryFailure ReadAsPropertyName(
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
            return new WebhookDeliveryFailure(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookDeliveryFailure value,
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
        public const string Exhausted = "exhausted";

        public const string Gone = "gone";

        public const string EndpointDisabled = "endpointDisabled";

        public const string NotConfigured = "notConfigured";
    }
}
