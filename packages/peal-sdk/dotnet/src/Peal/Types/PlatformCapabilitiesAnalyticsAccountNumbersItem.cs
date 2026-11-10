using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(PlatformCapabilitiesAnalyticsAccountNumbersItem.PlatformCapabilitiesAnalyticsAccountNumbersItemSerializer)
)]
[Serializable]
public readonly record struct PlatformCapabilitiesAnalyticsAccountNumbersItem : IStringEnum
{
    public static readonly PlatformCapabilitiesAnalyticsAccountNumbersItem Followers = new(
        Values.Followers
    );

    public static readonly PlatformCapabilitiesAnalyticsAccountNumbersItem Following = new(
        Values.Following
    );

    public static readonly PlatformCapabilitiesAnalyticsAccountNumbersItem Posts = new(
        Values.Posts
    );

    public static readonly PlatformCapabilitiesAnalyticsAccountNumbersItem Views = new(
        Values.Views
    );

    public static readonly PlatformCapabilitiesAnalyticsAccountNumbersItem Reach = new(
        Values.Reach
    );

    public PlatformCapabilitiesAnalyticsAccountNumbersItem(string value)
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
    public static PlatformCapabilitiesAnalyticsAccountNumbersItem FromCustom(string value)
    {
        return new PlatformCapabilitiesAnalyticsAccountNumbersItem(value);
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

    public static bool operator ==(
        PlatformCapabilitiesAnalyticsAccountNumbersItem value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        PlatformCapabilitiesAnalyticsAccountNumbersItem value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(PlatformCapabilitiesAnalyticsAccountNumbersItem value) =>
        value.Value;

    public static explicit operator PlatformCapabilitiesAnalyticsAccountNumbersItem(string value) =>
        new(value);

    internal class PlatformCapabilitiesAnalyticsAccountNumbersItemSerializer
        : JsonConverter<PlatformCapabilitiesAnalyticsAccountNumbersItem>
    {
        public override PlatformCapabilitiesAnalyticsAccountNumbersItem Read(
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
            return new PlatformCapabilitiesAnalyticsAccountNumbersItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PlatformCapabilitiesAnalyticsAccountNumbersItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PlatformCapabilitiesAnalyticsAccountNumbersItem ReadAsPropertyName(
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
            return new PlatformCapabilitiesAnalyticsAccountNumbersItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PlatformCapabilitiesAnalyticsAccountNumbersItem value,
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
        public const string Followers = "followers";

        public const string Following = "following";

        public const string Posts = "posts";

        public const string Views = "views";

        public const string Reach = "reach";
    }
}
