using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(AssistantSecretsNotConfiguredEncodedTag.AssistantSecretsNotConfiguredEncodedTagSerializer)
)]
[Serializable]
public readonly record struct AssistantSecretsNotConfiguredEncodedTag : IStringEnum
{
    public static readonly AssistantSecretsNotConfiguredEncodedTag AssistantSecretsNotConfigured =
        new(Values.AssistantSecretsNotConfigured);

    public AssistantSecretsNotConfiguredEncodedTag(string value)
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
    public static AssistantSecretsNotConfiguredEncodedTag FromCustom(string value)
    {
        return new AssistantSecretsNotConfiguredEncodedTag(value);
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

    public static bool operator ==(AssistantSecretsNotConfiguredEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantSecretsNotConfiguredEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantSecretsNotConfiguredEncodedTag value) =>
        value.Value;

    public static explicit operator AssistantSecretsNotConfiguredEncodedTag(string value) =>
        new(value);

    internal class AssistantSecretsNotConfiguredEncodedTagSerializer
        : JsonConverter<AssistantSecretsNotConfiguredEncodedTag>
    {
        public override AssistantSecretsNotConfiguredEncodedTag Read(
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
            return new AssistantSecretsNotConfiguredEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantSecretsNotConfiguredEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantSecretsNotConfiguredEncodedTag ReadAsPropertyName(
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
            return new AssistantSecretsNotConfiguredEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantSecretsNotConfiguredEncodedTag value,
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
        public const string AssistantSecretsNotConfigured = "AssistantSecretsNotConfigured";
    }
}
