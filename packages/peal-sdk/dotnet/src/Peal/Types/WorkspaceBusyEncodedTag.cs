using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(WorkspaceBusyEncodedTag.WorkspaceBusyEncodedTagSerializer))]
[Serializable]
public readonly record struct WorkspaceBusyEncodedTag : IStringEnum
{
    public static readonly WorkspaceBusyEncodedTag WorkspaceBusy = new(Values.WorkspaceBusy);

    public WorkspaceBusyEncodedTag(string value)
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
    public static WorkspaceBusyEncodedTag FromCustom(string value)
    {
        return new WorkspaceBusyEncodedTag(value);
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

    public static bool operator ==(WorkspaceBusyEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(WorkspaceBusyEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(WorkspaceBusyEncodedTag value) => value.Value;

    public static explicit operator WorkspaceBusyEncodedTag(string value) => new(value);

    internal class WorkspaceBusyEncodedTagSerializer : JsonConverter<WorkspaceBusyEncodedTag>
    {
        public override WorkspaceBusyEncodedTag Read(
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
            return new WorkspaceBusyEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            WorkspaceBusyEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override WorkspaceBusyEncodedTag ReadAsPropertyName(
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
            return new WorkspaceBusyEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            WorkspaceBusyEncodedTag value,
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
        public const string WorkspaceBusy = "WorkspaceBusy";
    }
}
