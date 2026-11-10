using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(PlatformCapabilitiesAnalyticsPostCountsItem.PlatformCapabilitiesAnalyticsPostCountsItemSerializer)
)]
[Serializable]
public readonly record struct PlatformCapabilitiesAnalyticsPostCountsItem : IStringEnum
{
    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Likes = new(Values.Likes);

    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Reposts = new(
        Values.Reposts
    );

    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Replies = new(
        Values.Replies
    );

    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Quotes = new(Values.Quotes);

    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Impressions = new(
        Values.Impressions
    );

    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Clicks = new(Values.Clicks);

    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Reach = new(Values.Reach);

    public static readonly PlatformCapabilitiesAnalyticsPostCountsItem Saves = new(Values.Saves);

    public PlatformCapabilitiesAnalyticsPostCountsItem(string value)
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
    public static PlatformCapabilitiesAnalyticsPostCountsItem FromCustom(string value)
    {
        return new PlatformCapabilitiesAnalyticsPostCountsItem(value);
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
        PlatformCapabilitiesAnalyticsPostCountsItem value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        PlatformCapabilitiesAnalyticsPostCountsItem value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(PlatformCapabilitiesAnalyticsPostCountsItem value) =>
        value.Value;

    public static explicit operator PlatformCapabilitiesAnalyticsPostCountsItem(string value) =>
        new(value);

    internal class PlatformCapabilitiesAnalyticsPostCountsItemSerializer
        : JsonConverter<PlatformCapabilitiesAnalyticsPostCountsItem>
    {
        public override PlatformCapabilitiesAnalyticsPostCountsItem Read(
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
            return new PlatformCapabilitiesAnalyticsPostCountsItem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PlatformCapabilitiesAnalyticsPostCountsItem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PlatformCapabilitiesAnalyticsPostCountsItem ReadAsPropertyName(
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
            return new PlatformCapabilitiesAnalyticsPostCountsItem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PlatformCapabilitiesAnalyticsPostCountsItem value,
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
        public const string Likes = "likes";

        public const string Reposts = "reposts";

        public const string Replies = "replies";

        public const string Quotes = "quotes";

        public const string Impressions = "impressions";

        public const string Clicks = "clicks";

        public const string Reach = "reach";

        public const string Saves = "saves";
    }
}
