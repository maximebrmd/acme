using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AdsMode.AdsModeSerializer))]
[Serializable]
public readonly record struct AdsMode : IStringEnum
{
    public static readonly AdsMode Off = new(Values.Off);

    public static readonly AdsMode Read = new(Values.Read);

    public static readonly AdsMode Spend = new(Values.Spend);

    public AdsMode(string value)
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
    public static AdsMode FromCustom(string value)
    {
        return new AdsMode(value);
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

    public static bool operator ==(AdsMode value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(AdsMode value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(AdsMode value) => value.Value;

    public static explicit operator AdsMode(string value) => new(value);

    internal class AdsModeSerializer : JsonConverter<AdsMode>
    {
        public override AdsMode Read(
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
            return new AdsMode(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AdsMode value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AdsMode ReadAsPropertyName(
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
            return new AdsMode(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AdsMode value,
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
        public const string Off = "off";

        public const string Read = "read";

        public const string Spend = "spend";
    }
}
