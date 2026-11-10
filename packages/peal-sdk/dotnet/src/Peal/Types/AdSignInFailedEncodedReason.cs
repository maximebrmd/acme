using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdSignInFailedEncodedReason.AdSignInFailedEncodedReasonSerializer))]
[Serializable]
public readonly record struct AdSignInFailedEncodedReason : IStringEnum
{
    public static readonly AdSignInFailedEncodedReason Denied = new(Values.Denied);

    public static readonly AdSignInFailedEncodedReason Expired = new(Values.Expired);

    public static readonly AdSignInFailedEncodedReason Failed = new(Values.Failed);

    public static readonly AdSignInFailedEncodedReason NotConfigured = new(Values.NotConfigured);

    public AdSignInFailedEncodedReason(string value)
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
    public static AdSignInFailedEncodedReason FromCustom(string value)
    {
        return new AdSignInFailedEncodedReason(value);
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

    public static bool operator ==(AdSignInFailedEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdSignInFailedEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdSignInFailedEncodedReason value) => value.Value;

    public static explicit operator AdSignInFailedEncodedReason(string value) => new(value);

    internal class AdSignInFailedEncodedReasonSerializer
        : JsonConverter<AdSignInFailedEncodedReason>
    {
        public override AdSignInFailedEncodedReason Read(
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
            return new AdSignInFailedEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdSignInFailedEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdSignInFailedEncodedReason ReadAsPropertyName(
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
            return new AdSignInFailedEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdSignInFailedEncodedReason value,
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
        public const string Denied = "denied";

        public const string Expired = "expired";

        public const string Failed = "failed";

        public const string NotConfigured = "notConfigured";
    }
}
