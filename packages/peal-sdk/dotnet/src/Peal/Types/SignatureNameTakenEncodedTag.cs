using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SignatureNameTakenEncodedTag.SignatureNameTakenEncodedTagSerializer))]
[Serializable]
public readonly record struct SignatureNameTakenEncodedTag : IStringEnum
{
    public static readonly SignatureNameTakenEncodedTag SignatureNameTaken = new(
        Values.SignatureNameTaken
    );

    public SignatureNameTakenEncodedTag(string value)
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
    public static SignatureNameTakenEncodedTag FromCustom(string value)
    {
        return new SignatureNameTakenEncodedTag(value);
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

    public static bool operator ==(SignatureNameTakenEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignatureNameTakenEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignatureNameTakenEncodedTag value) => value.Value;

    public static explicit operator SignatureNameTakenEncodedTag(string value) => new(value);

    internal class SignatureNameTakenEncodedTagSerializer
        : JsonConverter<SignatureNameTakenEncodedTag>
    {
        public override SignatureNameTakenEncodedTag Read(
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
            return new SignatureNameTakenEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignatureNameTakenEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignatureNameTakenEncodedTag ReadAsPropertyName(
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
            return new SignatureNameTakenEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignatureNameTakenEncodedTag value,
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
        public const string SignatureNameTaken = "SignatureNameTaken";
    }
}
