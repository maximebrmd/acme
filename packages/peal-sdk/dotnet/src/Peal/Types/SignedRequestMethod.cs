using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SignedRequestMethod.SignedRequestMethodSerializer))]
[Serializable]
public readonly record struct SignedRequestMethod : IStringEnum
{
    public static readonly SignedRequestMethod Put = new(Values.Put);

    public SignedRequestMethod(string value)
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
    public static SignedRequestMethod FromCustom(string value)
    {
        return new SignedRequestMethod(value);
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

    public static bool operator ==(SignedRequestMethod value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(SignedRequestMethod value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SignedRequestMethod value) => value.Value;

    public static explicit operator SignedRequestMethod(string value) => new(value);

    internal class SignedRequestMethodSerializer : JsonConverter<SignedRequestMethod>
    {
        public override SignedRequestMethod Read(
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
            return new SignedRequestMethod(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignedRequestMethod value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SignedRequestMethod ReadAsPropertyName(
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
            return new SignedRequestMethod(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignedRequestMethod value,
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
        public const string Put = "PUT";
    }
}
