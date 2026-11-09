using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TikTokBlock.TikTokBlockSerializer))]
[Serializable]
public readonly record struct TikTokBlock : IStringEnum
{
    public static readonly TikTokBlock PostLimit = new(Values.PostLimit);

    public static readonly TikTokBlock Banned = new(Values.Banned);

    public static readonly TikTokBlock ClientLimit = new(Values.ClientLimit);

    public TikTokBlock(string value)
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
    public static TikTokBlock FromCustom(string value)
    {
        return new TikTokBlock(value);
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

    public static bool operator ==(TikTokBlock value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TikTokBlock value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TikTokBlock value) => value.Value;

    public static explicit operator TikTokBlock(string value) => new(value);

    internal class TikTokBlockSerializer : JsonConverter<TikTokBlock>
    {
        public override TikTokBlock Read(
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
            return new TikTokBlock(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TikTokBlock value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TikTokBlock ReadAsPropertyName(
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
            return new TikTokBlock(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TikTokBlock value,
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
        public const string PostLimit = "postLimit";

        public const string Banned = "banned";

        public const string ClientLimit = "clientLimit";
    }
}
