using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostOriginVia.PostOriginViaSerializer))]
[Serializable]
public readonly record struct PostOriginVia : IStringEnum
{
    public static readonly PostOriginVia Web = new(Values.Web);

    public static readonly PostOriginVia ApiKey = new(Values.ApiKey);

    public static readonly PostOriginVia Application = new(Values.Application);

    public PostOriginVia(string value)
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
    public static PostOriginVia FromCustom(string value)
    {
        return new PostOriginVia(value);
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

    public static bool operator ==(PostOriginVia value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PostOriginVia value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostOriginVia value) => value.Value;

    public static explicit operator PostOriginVia(string value) => new(value);

    internal class PostOriginViaSerializer : JsonConverter<PostOriginVia>
    {
        public override PostOriginVia Read(
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
            return new PostOriginVia(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostOriginVia value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostOriginVia ReadAsPropertyName(
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
            return new PostOriginVia(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostOriginVia value,
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
        public const string Web = "web";

        public const string ApiKey = "apiKey";

        public const string Application = "application";
    }
}
