using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdAccountUnusableEncodedReason.AdAccountUnusableEncodedReasonSerializer))]
[Serializable]
public readonly record struct AdAccountUnusableEncodedReason : IStringEnum
{
    public static readonly AdAccountUnusableEncodedReason Status = new(Values.Status);

    public static readonly AdAccountUnusableEncodedReason ReconnectNeeded = new(
        Values.ReconnectNeeded
    );

    public static readonly AdAccountUnusableEncodedReason Permission = new(Values.Permission);

    public AdAccountUnusableEncodedReason(string value)
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
    public static AdAccountUnusableEncodedReason FromCustom(string value)
    {
        return new AdAccountUnusableEncodedReason(value);
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

    public static bool operator ==(AdAccountUnusableEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdAccountUnusableEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdAccountUnusableEncodedReason value) => value.Value;

    public static explicit operator AdAccountUnusableEncodedReason(string value) => new(value);

    internal class AdAccountUnusableEncodedReasonSerializer
        : JsonConverter<AdAccountUnusableEncodedReason>
    {
        public override AdAccountUnusableEncodedReason Read(
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
            return new AdAccountUnusableEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdAccountUnusableEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdAccountUnusableEncodedReason ReadAsPropertyName(
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
            return new AdAccountUnusableEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdAccountUnusableEncodedReason value,
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
        public const string Status = "status";

        public const string ReconnectNeeded = "reconnectNeeded";

        public const string Permission = "permission";
    }
}
