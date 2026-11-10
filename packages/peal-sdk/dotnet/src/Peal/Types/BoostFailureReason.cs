using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BoostFailureReason.BoostFailureReasonSerializer))]
[Serializable]
public readonly record struct BoostFailureReason : IStringEnum
{
    public static readonly BoostFailureReason AccountUnusable = new(Values.AccountUnusable);

    public static readonly BoostFailureReason AccountSpendCap = new(Values.AccountSpendCap);

    public static readonly BoostFailureReason CeilingExceeded = new(Values.CeilingExceeded);

    public static readonly BoostFailureReason SpendingOff = new(Values.SpendingOff);

    public static readonly BoostFailureReason CurrencyMismatch = new(Values.CurrencyMismatch);

    public static readonly BoostFailureReason BudgetTooLow = new(Values.BudgetTooLow);

    public static readonly BoostFailureReason PostNotPromotable = new(Values.PostNotPromotable);

    public static readonly BoostFailureReason PermissionMissing = new(Values.PermissionMissing);

    public static readonly BoostFailureReason ReconnectNeeded = new(Values.ReconnectNeeded);

    public static readonly BoostFailureReason NetworkUnavailable = new(Values.NetworkUnavailable);

    public static readonly BoostFailureReason Refused = new(Values.Refused);

    public static readonly BoostFailureReason SpendingUnavailable = new(Values.SpendingUnavailable);

    public BoostFailureReason(string value)
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
    public static BoostFailureReason FromCustom(string value)
    {
        return new BoostFailureReason(value);
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

    public static bool operator ==(BoostFailureReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BoostFailureReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BoostFailureReason value) => value.Value;

    public static explicit operator BoostFailureReason(string value) => new(value);

    internal class BoostFailureReasonSerializer : JsonConverter<BoostFailureReason>
    {
        public override BoostFailureReason Read(
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
            return new BoostFailureReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BoostFailureReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BoostFailureReason ReadAsPropertyName(
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
            return new BoostFailureReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BoostFailureReason value,
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
        public const string AccountUnusable = "accountUnusable";

        public const string AccountSpendCap = "accountSpendCap";

        public const string CeilingExceeded = "ceilingExceeded";

        public const string SpendingOff = "spendingOff";

        public const string CurrencyMismatch = "currencyMismatch";

        public const string BudgetTooLow = "budgetTooLow";

        public const string PostNotPromotable = "postNotPromotable";

        public const string PermissionMissing = "permissionMissing";

        public const string ReconnectNeeded = "reconnectNeeded";

        public const string NetworkUnavailable = "networkUnavailable";

        public const string Refused = "refused";

        public const string SpendingUnavailable = "spendingUnavailable";
    }
}
