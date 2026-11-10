using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ChannelStatusName.ChannelStatusNameSerializer))]
[Serializable]
public readonly record struct ChannelStatusName : IStringEnum
{
    public static readonly ChannelStatusName Active = new(Values.Active);

    public static readonly ChannelStatusName RefreshNeeded = new(Values.RefreshNeeded);

    public static readonly ChannelStatusName Disabled = new(Values.Disabled);

    public ChannelStatusName(string value)
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
    public static ChannelStatusName FromCustom(string value)
    {
        return new ChannelStatusName(value);
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

    public static bool operator ==(ChannelStatusName value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ChannelStatusName value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ChannelStatusName value) => value.Value;

    public static explicit operator ChannelStatusName(string value) => new(value);

    internal class ChannelStatusNameSerializer : JsonConverter<ChannelStatusName>
    {
        public override ChannelStatusName Read(
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
            return new ChannelStatusName(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ChannelStatusName value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ChannelStatusName ReadAsPropertyName(
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
            return new ChannelStatusName(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ChannelStatusName value,
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
        public const string Active = "active";

        public const string RefreshNeeded = "refreshNeeded";

        public const string Disabled = "disabled";
    }
}
