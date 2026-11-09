using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MeUserLocale.MeUserLocaleSerializer))]
[Serializable]
public readonly record struct MeUserLocale : IStringEnum
{
    public static readonly MeUserLocale En = new(Values.En);

    public static readonly MeUserLocale Fr = new(Values.Fr);

    public MeUserLocale(string value)
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
    public static MeUserLocale FromCustom(string value)
    {
        return new MeUserLocale(value);
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

    public static bool operator ==(MeUserLocale value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(MeUserLocale value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(MeUserLocale value) => value.Value;

    public static explicit operator MeUserLocale(string value) => new(value);

    internal class MeUserLocaleSerializer : JsonConverter<MeUserLocale>
    {
        public override MeUserLocale Read(
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
            return new MeUserLocale(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MeUserLocale value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override MeUserLocale ReadAsPropertyName(
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
            return new MeUserLocale(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MeUserLocale value,
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
        public const string En = "en";

        public const string Fr = "fr";
    }
}
