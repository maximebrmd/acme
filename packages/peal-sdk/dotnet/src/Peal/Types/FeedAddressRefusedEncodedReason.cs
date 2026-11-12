using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedAddressRefusedEncodedReason.FeedAddressRefusedEncodedReasonSerializer))]
[Serializable]
public readonly record struct FeedAddressRefusedEncodedReason : IStringEnum
{
    public static readonly FeedAddressRefusedEncodedReason Credentials = new(Values.Credentials);

    public static readonly FeedAddressRefusedEncodedReason Malformed = new(Values.Malformed);

    public static readonly FeedAddressRefusedEncodedReason NotHttps = new(Values.NotHttps);

    public static readonly FeedAddressRefusedEncodedReason NotPublic = new(Values.NotPublic);

    public FeedAddressRefusedEncodedReason(string value)
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
    public static FeedAddressRefusedEncodedReason FromCustom(string value)
    {
        return new FeedAddressRefusedEncodedReason(value);
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

    public static bool operator ==(FeedAddressRefusedEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedAddressRefusedEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedAddressRefusedEncodedReason value) => value.Value;

    public static explicit operator FeedAddressRefusedEncodedReason(string value) => new(value);

    internal class FeedAddressRefusedEncodedReasonSerializer
        : JsonConverter<FeedAddressRefusedEncodedReason>
    {
        public override FeedAddressRefusedEncodedReason Read(
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
            return new FeedAddressRefusedEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedAddressRefusedEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedAddressRefusedEncodedReason ReadAsPropertyName(
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
            return new FeedAddressRefusedEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedAddressRefusedEncodedReason value,
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
        public const string Credentials = "credentials";

        public const string Malformed = "malformed";

        public const string NotHttps = "notHttps";

        public const string NotPublic = "notPublic";
    }
}
