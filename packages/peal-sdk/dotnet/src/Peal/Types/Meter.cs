using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(Meter.MeterSerializer))]
[Serializable]
public readonly record struct Meter : IStringEnum
{
    public static readonly Meter AssistantRequests = new(Values.AssistantRequests);

    public static readonly Meter AssistantImages = new(Values.AssistantImages);

    public static readonly Meter OutboundMessages = new(Values.OutboundMessages);

    public static readonly Meter ManagedAds = new(Values.ManagedAds);

    public static readonly Meter XApi = new(Values.XApi);

    public Meter(string value)
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
    public static Meter FromCustom(string value)
    {
        return new Meter(value);
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

    public static bool operator ==(Meter value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(Meter value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(Meter value) => value.Value;

    public static explicit operator Meter(string value) => new(value);

    internal class MeterSerializer : JsonConverter<Meter>
    {
        public override Meter Read(
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
            return new Meter(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            Meter value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override Meter ReadAsPropertyName(
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
            return new Meter(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            Meter value,
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
        public const string AssistantRequests = "assistantRequests";

        public const string AssistantImages = "assistantImages";

        public const string OutboundMessages = "outboundMessages";

        public const string ManagedAds = "managedAds";

        public const string XApi = "xApi";
    }
}
