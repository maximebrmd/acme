using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantTone.AssistantToneSerializer))]
[Serializable]
public readonly record struct AssistantTone : IStringEnum
{
    public static readonly AssistantTone Professional = new(Values.Professional);

    public static readonly AssistantTone Friendly = new(Values.Friendly);

    public static readonly AssistantTone Casual = new(Values.Casual);

    public static readonly AssistantTone Enthusiastic = new(Values.Enthusiastic);

    public static readonly AssistantTone Witty = new(Values.Witty);

    public AssistantTone(string value)
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
    public static AssistantTone FromCustom(string value)
    {
        return new AssistantTone(value);
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

    public static bool operator ==(AssistantTone value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantTone value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantTone value) => value.Value;

    public static explicit operator AssistantTone(string value) => new(value);

    internal class AssistantToneSerializer : JsonConverter<AssistantTone>
    {
        public override AssistantTone Read(
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
            return new AssistantTone(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantTone value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantTone ReadAsPropertyName(
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
            return new AssistantTone(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantTone value,
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
        public const string Professional = "professional";

        public const string Friendly = "friendly";

        public const string Casual = "casual";

        public const string Enthusiastic = "enthusiastic";

        public const string Witty = "witty";
    }
}
