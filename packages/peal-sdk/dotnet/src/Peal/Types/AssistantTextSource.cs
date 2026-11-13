using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantTextSource.AssistantTextSourceSerializer))]
[Serializable]
public readonly record struct AssistantTextSource : IStringEnum
{
    public static readonly AssistantTextSource Workspace = new(Values.Workspace);

    public static readonly AssistantTextSource Server = new(Values.Server);

    public AssistantTextSource(string value)
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
    public static AssistantTextSource FromCustom(string value)
    {
        return new AssistantTextSource(value);
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

    public static bool operator ==(AssistantTextSource value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantTextSource value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantTextSource value) => value.Value;

    public static explicit operator AssistantTextSource(string value) => new(value);

    internal class AssistantTextSourceSerializer : JsonConverter<AssistantTextSource>
    {
        public override AssistantTextSource Read(
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
            return new AssistantTextSource(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantTextSource value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantTextSource ReadAsPropertyName(
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
            return new AssistantTextSource(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantTextSource value,
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
        public const string Workspace = "workspace";

        public const string Server = "server";
    }
}
