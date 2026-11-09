using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WorkspaceNotFoundEncodedTag.WorkspaceNotFoundEncodedTagSerializer))]
[Serializable]
public readonly record struct WorkspaceNotFoundEncodedTag : IStringEnum
{
    public static readonly WorkspaceNotFoundEncodedTag WorkspaceNotFound = new(
        Values.WorkspaceNotFound
    );

    public WorkspaceNotFoundEncodedTag(string value)
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
    public static WorkspaceNotFoundEncodedTag FromCustom(string value)
    {
        return new WorkspaceNotFoundEncodedTag(value);
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

    public static bool operator ==(WorkspaceNotFoundEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WorkspaceNotFoundEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WorkspaceNotFoundEncodedTag value) => value.Value;

    public static explicit operator WorkspaceNotFoundEncodedTag(string value) => new(value);

    internal class WorkspaceNotFoundEncodedTagSerializer
        : JsonConverter<WorkspaceNotFoundEncodedTag>
    {
        public override WorkspaceNotFoundEncodedTag Read(
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
            return new WorkspaceNotFoundEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WorkspaceNotFoundEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WorkspaceNotFoundEncodedTag ReadAsPropertyName(
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
            return new WorkspaceNotFoundEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WorkspaceNotFoundEncodedTag value,
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
        public const string WorkspaceNotFound = "WorkspaceNotFound";
    }
}
