using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SpecialAdCategory.SpecialAdCategorySerializer))]
[Serializable]
public readonly record struct SpecialAdCategory : IStringEnum
{
    public static readonly SpecialAdCategory None = new(Values.None);

    public static readonly SpecialAdCategory Housing = new(Values.Housing);

    public static readonly SpecialAdCategory Employment = new(Values.Employment);

    public static readonly SpecialAdCategory FinancialProductsServices = new(
        Values.FinancialProductsServices
    );

    public static readonly SpecialAdCategory IssuesElectionsPolitics = new(
        Values.IssuesElectionsPolitics
    );

    public SpecialAdCategory(string value)
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
    public static SpecialAdCategory FromCustom(string value)
    {
        return new SpecialAdCategory(value);
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

    public static bool operator ==(SpecialAdCategory value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SpecialAdCategory value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SpecialAdCategory value) => value.Value;

    public static explicit operator SpecialAdCategory(string value) => new(value);

    internal class SpecialAdCategorySerializer : JsonConverter<SpecialAdCategory>
    {
        public override SpecialAdCategory Read(
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
            return new SpecialAdCategory(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SpecialAdCategory value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SpecialAdCategory ReadAsPropertyName(
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
            return new SpecialAdCategory(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SpecialAdCategory value,
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
        public const string None = "none";

        public const string Housing = "housing";

        public const string Employment = "employment";

        public const string FinancialProductsServices = "financialProductsServices";

        public const string IssuesElectionsPolitics = "issuesElectionsPolitics";
    }
}
