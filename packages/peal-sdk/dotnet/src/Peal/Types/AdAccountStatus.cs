using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdAccountStatus.AdAccountStatusSerializer))]
[Serializable]
public readonly record struct AdAccountStatus : IStringEnum
{
    public static readonly AdAccountStatus Active = new(Values.Active);

    public static readonly AdAccountStatus InGracePeriod = new(Values.InGracePeriod);

    public static readonly AdAccountStatus Unsettled = new(Values.Unsettled);

    public static readonly AdAccountStatus PendingReview = new(Values.PendingReview);

    public static readonly AdAccountStatus Disabled = new(Values.Disabled);

    public static readonly AdAccountStatus Closed = new(Values.Closed);

    public static readonly AdAccountStatus Unknown = new(Values.Unknown);

    public AdAccountStatus(string value)
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
    public static AdAccountStatus FromCustom(string value)
    {
        return new AdAccountStatus(value);
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

    public static bool operator ==(AdAccountStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdAccountStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdAccountStatus value) => value.Value;

    public static explicit operator AdAccountStatus(string value) => new(value);

    internal class AdAccountStatusSerializer : JsonConverter<AdAccountStatus>
    {
        public override AdAccountStatus Read(
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
            return new AdAccountStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdAccountStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdAccountStatus ReadAsPropertyName(
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
            return new AdAccountStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdAccountStatus value,
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
        public const string Active = "active";

        public const string InGracePeriod = "inGracePeriod";

        public const string Unsettled = "unsettled";

        public const string PendingReview = "pendingReview";

        public const string Disabled = "disabled";

        public const string Closed = "closed";

        public const string Unknown = "unknown";
    }
}
