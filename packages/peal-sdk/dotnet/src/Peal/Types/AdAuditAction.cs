using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdAuditAction.AdAuditActionSerializer))]
[Serializable]
public readonly record struct AdAuditAction : IStringEnum
{
    public static readonly AdAuditAction AccountConnected = new(Values.AccountConnected);

    public static readonly AdAuditAction AccountDisconnected = new(Values.AccountDisconnected);

    public static readonly AdAuditAction SpendingEnabled = new(Values.SpendingEnabled);

    public static readonly AdAuditAction SpendingDisabled = new(Values.SpendingDisabled);

    public static readonly AdAuditAction CeilingChanged = new(Values.CeilingChanged);

    public static readonly AdAuditAction BoostRequested = new(Values.BoostRequested);

    public static readonly AdAuditAction BoostStarted = new(Values.BoostStarted);

    public static readonly AdAuditAction BoostUnconfirmed = new(Values.BoostUnconfirmed);

    public static readonly AdAuditAction BoostFailed = new(Values.BoostFailed);

    public static readonly AdAuditAction BoostPaused = new(Values.BoostPaused);

    public static readonly AdAuditAction BoostResumed = new(Values.BoostResumed);

    public static readonly AdAuditAction BoostStopped = new(Values.BoostStopped);

    public static readonly AdAuditAction BoostEnded = new(Values.BoostEnded);

    public AdAuditAction(string value)
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
    public static AdAuditAction FromCustom(string value)
    {
        return new AdAuditAction(value);
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

    public static bool operator ==(AdAuditAction value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AdAuditAction value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AdAuditAction value) => value.Value;

    public static explicit operator AdAuditAction(string value) => new(value);

    internal class AdAuditActionSerializer : JsonConverter<AdAuditAction>
    {
        public override AdAuditAction Read(
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
            return new AdAuditAction(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdAuditAction value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdAuditAction ReadAsPropertyName(
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
            return new AdAuditAction(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdAuditAction value,
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
        public const string AccountConnected = "accountConnected";

        public const string AccountDisconnected = "accountDisconnected";

        public const string SpendingEnabled = "spendingEnabled";

        public const string SpendingDisabled = "spendingDisabled";

        public const string CeilingChanged = "ceilingChanged";

        public const string BoostRequested = "boostRequested";

        public const string BoostStarted = "boostStarted";

        public const string BoostUnconfirmed = "boostUnconfirmed";

        public const string BoostFailed = "boostFailed";

        public const string BoostPaused = "boostPaused";

        public const string BoostResumed = "boostResumed";

        public const string BoostStopped = "boostStopped";

        public const string BoostEnded = "boostEnded";
    }
}
