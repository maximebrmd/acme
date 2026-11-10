using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BoostBudgetKind.BoostBudgetKindSerializer))]
[Serializable]
public readonly record struct BoostBudgetKind : IStringEnum
{
    public static readonly BoostBudgetKind Total = new(Values.Total);

    public static readonly BoostBudgetKind Daily = new(Values.Daily);

    public BoostBudgetKind(string value)
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
    public static BoostBudgetKind FromCustom(string value)
    {
        return new BoostBudgetKind(value);
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

    public static bool operator ==(BoostBudgetKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BoostBudgetKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BoostBudgetKind value) => value.Value;

    public static explicit operator BoostBudgetKind(string value) => new(value);

    internal class BoostBudgetKindSerializer : JsonConverter<BoostBudgetKind>
    {
        public override BoostBudgetKind Read(
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
            return new BoostBudgetKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BoostBudgetKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BoostBudgetKind ReadAsPropertyName(
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
            return new BoostBudgetKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BoostBudgetKind value,
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
        public const string Total = "total";

        public const string Daily = "daily";
    }
}
