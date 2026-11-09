using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UnauthenticatedEncodedTag.UnauthenticatedEncodedTagSerializer))]
[Serializable]
public readonly record struct UnauthenticatedEncodedTag : IStringEnum
{
    public static readonly UnauthenticatedEncodedTag Unauthenticated = new(Values.Unauthenticated);

    public UnauthenticatedEncodedTag(string value)
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
    public static UnauthenticatedEncodedTag FromCustom(string value)
    {
        return new UnauthenticatedEncodedTag(value);
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

    public static bool operator ==(UnauthenticatedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UnauthenticatedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UnauthenticatedEncodedTag value) => value.Value;

    public static explicit operator UnauthenticatedEncodedTag(string value) => new(value);

    internal class UnauthenticatedEncodedTagSerializer : JsonConverter<UnauthenticatedEncodedTag>
    {
        public override UnauthenticatedEncodedTag Read(
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
            return new UnauthenticatedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UnauthenticatedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UnauthenticatedEncodedTag ReadAsPropertyName(
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
            return new UnauthenticatedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UnauthenticatedEncodedTag value,
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
        public const string Unauthenticated = "Unauthenticated";
    }
}
