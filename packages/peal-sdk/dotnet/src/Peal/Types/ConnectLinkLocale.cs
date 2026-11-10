using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ConnectLinkLocale.ConnectLinkLocaleSerializer))]
[Serializable]
public readonly record struct ConnectLinkLocale : IStringEnum
{
    public static readonly ConnectLinkLocale En = new(Values.En);

    public static readonly ConnectLinkLocale Fr = new(Values.Fr);

    public ConnectLinkLocale(string value)
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
    public static ConnectLinkLocale FromCustom(string value)
    {
        return new ConnectLinkLocale(value);
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

    public static bool operator ==(ConnectLinkLocale value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ConnectLinkLocale value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ConnectLinkLocale value) => value.Value;

    public static explicit operator ConnectLinkLocale(string value) => new(value);

    internal class ConnectLinkLocaleSerializer : JsonConverter<ConnectLinkLocale>
    {
        public override ConnectLinkLocale Read(
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
            return new ConnectLinkLocale(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ConnectLinkLocale value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ConnectLinkLocale ReadAsPropertyName(
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
            return new ConnectLinkLocale(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ConnectLinkLocale value,
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
