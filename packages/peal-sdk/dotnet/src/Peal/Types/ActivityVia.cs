using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ActivityVia.ActivityViaSerializer))]
[Serializable]
public readonly record struct ActivityVia : IStringEnum
{
    public static readonly ActivityVia Session = new(Values.Session);

    public static readonly ActivityVia ApiKey = new(Values.ApiKey);

    public static readonly ActivityVia Oauth = new(Values.Oauth);

    public static readonly ActivityVia Mcp = new(Values.Mcp);

    public static readonly ActivityVia PartnerKey = new(Values.PartnerKey);

    public static readonly ActivityVia ConnectLink = new(Values.ConnectLink);

    public ActivityVia(string value)
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
    public static ActivityVia FromCustom(string value)
    {
        return new ActivityVia(value);
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

    public static bool operator ==(ActivityVia value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ActivityVia value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ActivityVia value) => value.Value;

    public static explicit operator ActivityVia(string value) => new(value);

    internal class ActivityViaSerializer : JsonConverter<ActivityVia>
    {
        public override ActivityVia Read(
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
            return new ActivityVia(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ActivityVia value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ActivityVia ReadAsPropertyName(
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
            return new ActivityVia(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ActivityVia value,
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
        public const string Session = "session";

        public const string ApiKey = "apiKey";

        public const string Oauth = "oauth";

        public const string Mcp = "mcp";

        public const string PartnerKey = "partnerKey";

        public const string ConnectLink = "connectLink";
    }
}
