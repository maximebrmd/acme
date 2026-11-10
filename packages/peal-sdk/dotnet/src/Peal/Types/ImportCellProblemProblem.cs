using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ImportCellProblemProblem.ImportCellProblemProblemSerializer))]
[Serializable]
public readonly record struct ImportCellProblemProblem : IStringEnum
{
    public static readonly ImportCellProblemProblem Missing = new(Values.Missing);

    public static readonly ImportCellProblemProblem Invalid = new(Values.Invalid);

    public ImportCellProblemProblem(string value)
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
    public static ImportCellProblemProblem FromCustom(string value)
    {
        return new ImportCellProblemProblem(value);
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

    public static bool operator ==(ImportCellProblemProblem value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ImportCellProblemProblem value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ImportCellProblemProblem value) => value.Value;

    public static explicit operator ImportCellProblemProblem(string value) => new(value);

    internal class ImportCellProblemProblemSerializer : JsonConverter<ImportCellProblemProblem>
    {
        public override ImportCellProblemProblem Read(
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
            return new ImportCellProblemProblem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImportCellProblemProblem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ImportCellProblemProblem ReadAsPropertyName(
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
            return new ImportCellProblemProblem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImportCellProblemProblem value,
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
        public const string Missing = "missing";

        public const string Invalid = "invalid";
    }
}
