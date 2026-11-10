using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BoostViolation.BoostViolationSerializer))]
[Serializable]
public readonly record struct BoostViolation : IStringEnum
{
    public static readonly BoostViolation CurrencyMismatch = new(Values.CurrencyMismatch);

    public static readonly BoostViolation BudgetEmpty = new(Values.BudgetEmpty);

    public static readonly BoostViolation EndsBeforeStart = new(Values.EndsBeforeStart);

    public static readonly BoostViolation RunTooShort = new(Values.RunTooShort);

    public static readonly BoostViolation RunTooLong = new(Values.RunTooLong);

    public static readonly BoostViolation StartsTooFarAhead = new(Values.StartsTooFarAhead);

    public static readonly BoostViolation AgeRange = new(Values.AgeRange);

    public static readonly BoostViolation SpecialCategory = new(Values.SpecialCategory);

    public static readonly BoostViolation BeneficiaryRequired = new(Values.BeneficiaryRequired);

    public BoostViolation(string value)
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
    public static BoostViolation FromCustom(string value)
    {
        return new BoostViolation(value);
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

    public static bool operator ==(BoostViolation value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BoostViolation value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BoostViolation value) => value.Value;

    public static explicit operator BoostViolation(string value) => new(value);

    internal class BoostViolationSerializer : JsonConverter<BoostViolation>
    {
        public override BoostViolation Read(
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
            return new BoostViolation(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BoostViolation value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BoostViolation ReadAsPropertyName(
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
            return new BoostViolation(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BoostViolation value,
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
        public const string CurrencyMismatch = "currencyMismatch";

        public const string BudgetEmpty = "budgetEmpty";

        public const string EndsBeforeStart = "endsBeforeStart";

        public const string RunTooShort = "runTooShort";

        public const string RunTooLong = "runTooLong";

        public const string StartsTooFarAhead = "startsTooFarAhead";

        public const string AgeRange = "ageRange";

        public const string SpecialCategory = "specialCategory";

        public const string BeneficiaryRequired = "beneficiaryRequired";
    }
}
