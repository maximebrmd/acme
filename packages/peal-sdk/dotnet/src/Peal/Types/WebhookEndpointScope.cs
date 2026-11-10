using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WebhookEndpointScope.WebhookEndpointScopeSerializer))]
[Serializable]
public readonly record struct WebhookEndpointScope : IStringEnum
{
    public static readonly WebhookEndpointScope Workspace = new(Values.Workspace);

    public static readonly WebhookEndpointScope Partner = new(Values.Partner);

    public WebhookEndpointScope(string value)
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
    public static WebhookEndpointScope FromCustom(string value)
    {
        return new WebhookEndpointScope(value);
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

    public static bool operator ==(WebhookEndpointScope value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WebhookEndpointScope value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WebhookEndpointScope value) => value.Value;

    public static explicit operator WebhookEndpointScope(string value) => new(value);

    internal class WebhookEndpointScopeSerializer : JsonConverter<WebhookEndpointScope>
    {
        public override WebhookEndpointScope Read(
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
            return new WebhookEndpointScope(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WebhookEndpointScope value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WebhookEndpointScope ReadAsPropertyName(
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
            return new WebhookEndpointScope(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WebhookEndpointScope value,
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
        public const string Workspace = "workspace";

        public const string Partner = "partner";
    }
}
