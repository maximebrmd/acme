using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedItemOutcome.FeedItemOutcomeSerializer))]
[Serializable]
public readonly record struct FeedItemOutcome : IStringEnum
{
    public static readonly FeedItemOutcome Made = new(Values.Made);

    public static readonly FeedItemOutcome HeldBack = new(Values.HeldBack);

    public static readonly FeedItemOutcome Skipped = new(Values.Skipped);

    public static readonly FeedItemOutcome Claimed = new(Values.Claimed);

    public static readonly FeedItemOutcome Abandoned = new(Values.Abandoned);

    public FeedItemOutcome(string value)
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
    public static FeedItemOutcome FromCustom(string value)
    {
        return new FeedItemOutcome(value);
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

    public static bool operator ==(FeedItemOutcome value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedItemOutcome value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedItemOutcome value) => value.Value;

    public static explicit operator FeedItemOutcome(string value) => new(value);

    internal class FeedItemOutcomeSerializer : JsonConverter<FeedItemOutcome>
    {
        public override FeedItemOutcome Read(
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
            return new FeedItemOutcome(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedItemOutcome value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedItemOutcome ReadAsPropertyName(
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
            return new FeedItemOutcome(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedItemOutcome value,
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
        public const string Made = "made";

        public const string HeldBack = "heldBack";

        public const string Skipped = "skipped";

        public const string Claimed = "claimed";

        public const string Abandoned = "abandoned";
    }
}
