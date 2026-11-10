using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ImportProblem.ImportProblemSerializer))]
[Serializable]
public readonly record struct ImportProblem : IStringEnum
{
    public static readonly ImportProblem Empty = new(Values.Empty);

    public static readonly ImportProblem UnterminatedQuote = new(Values.UnterminatedQuote);

    public static readonly ImportProblem UnknownColumn = new(Values.UnknownColumn);

    public static readonly ImportProblem RepeatedColumn = new(Values.RepeatedColumn);

    public static readonly ImportProblem MissingColumn = new(Values.MissingColumn);

    public static readonly ImportProblem TooManyRows = new(Values.TooManyRows);

    public ImportProblem(string value)
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
    public static ImportProblem FromCustom(string value)
    {
        return new ImportProblem(value);
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

    public static bool operator ==(ImportProblem value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ImportProblem value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ImportProblem value) => value.Value;

    public static explicit operator ImportProblem(string value) => new(value);

    internal class ImportProblemSerializer : JsonConverter<ImportProblem>
    {
        public override ImportProblem Read(
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
            return new ImportProblem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImportProblem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ImportProblem ReadAsPropertyName(
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
            return new ImportProblem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImportProblem value,
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
        public const string Empty = "empty";

        public const string UnterminatedQuote = "unterminatedQuote";

        public const string UnknownColumn = "unknownColumn";

        public const string RepeatedColumn = "repeatedColumn";

        public const string MissingColumn = "missingColumn";

        public const string TooManyRows = "tooManyRows";
    }
}
