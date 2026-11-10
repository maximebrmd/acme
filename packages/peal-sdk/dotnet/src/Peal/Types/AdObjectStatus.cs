using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdObjectStatus.AdObjectStatusSerializer))]
[Serializable]
public readonly record struct AdObjectStatus : IStringEnum
{
    public static readonly AdObjectStatus Active = new(Values.Active);

    public static readonly AdObjectStatus Paused = new(Values.Paused);

    public static readonly AdObjectStatus InReview = new(Values.InReview);

    public static readonly AdObjectStatus Rejected = new(Values.Rejected);

    public static readonly AdObjectStatus WithIssues = new(Values.WithIssues);

    public static readonly AdObjectStatus Archived = new(Values.Archived);

    public static readonly AdObjectStatus Deleted = new(Values.Deleted);

    public static readonly AdObjectStatus Unknown = new(Values.Unknown);

    public AdObjectStatus(string value)
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
    public static AdObjectStatus FromCustom(string value)
    {
        return new AdObjectStatus(value);
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

    public static bool operator ==(AdObjectStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdObjectStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdObjectStatus value) => value.Value;

    public static explicit operator AdObjectStatus(string value) => new(value);

    internal class AdObjectStatusSerializer : JsonConverter<AdObjectStatus>
    {
        public override AdObjectStatus Read(
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
            return new AdObjectStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdObjectStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdObjectStatus ReadAsPropertyName(
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
            return new AdObjectStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdObjectStatus value,
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

        public const string Paused = "paused";

        public const string InReview = "inReview";

        public const string Rejected = "rejected";

        public const string WithIssues = "withIssues";

        public const string Archived = "archived";

        public const string Deleted = "deleted";

        public const string Unknown = "unknown";
    }
}
