using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SiteNotConnectedReason.SiteNotConnectedReasonSerializer))]
[Serializable]
public readonly record struct SiteNotConnectedReason : IStringEnum
{
    public static readonly SiteNotConnectedReason NotWordPress = new(Values.NotWordPress);

    public static readonly SiteNotConnectedReason AddressNotAllowed = new(Values.AddressNotAllowed);

    public static readonly SiteNotConnectedReason CredentialsRefused = new(
        Values.CredentialsRefused
    );

    public static readonly SiteNotConnectedReason CannotPublish = new(Values.CannotPublish);

    public SiteNotConnectedReason(string value)
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
    public static SiteNotConnectedReason FromCustom(string value)
    {
        return new SiteNotConnectedReason(value);
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

    public static bool operator ==(SiteNotConnectedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SiteNotConnectedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SiteNotConnectedReason value) => value.Value;

    public static explicit operator SiteNotConnectedReason(string value) => new(value);

    internal class SiteNotConnectedReasonSerializer : JsonConverter<SiteNotConnectedReason>
    {
        public override SiteNotConnectedReason Read(
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
            return new SiteNotConnectedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SiteNotConnectedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SiteNotConnectedReason ReadAsPropertyName(
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
            return new SiteNotConnectedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SiteNotConnectedReason value,
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
        public const string NotWordPress = "notWordPress";

        public const string AddressNotAllowed = "addressNotAllowed";

        public const string CredentialsRefused = "credentialsRefused";

        public const string CannotPublish = "cannotPublish";
    }
}
