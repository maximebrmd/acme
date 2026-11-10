using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PartnerScope.PartnerScopeSerializer))]
[Serializable]
public readonly record struct PartnerScope : IStringEnum
{
    public static readonly PartnerScope WorkspacesRead = new(Values.WorkspacesRead);

    public static readonly PartnerScope WorkspacesWrite = new(Values.WorkspacesWrite);

    public static readonly PartnerScope WorkspacesDelete = new(Values.WorkspacesDelete);

    public PartnerScope(string value)
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
    public static PartnerScope FromCustom(string value)
    {
        return new PartnerScope(value);
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

    public static bool operator ==(PartnerScope value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PartnerScope value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PartnerScope value) => value.Value;

    public static explicit operator PartnerScope(string value) => new(value);

    internal class PartnerScopeSerializer : JsonConverter<PartnerScope>
    {
        public override PartnerScope Read(
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
            return new PartnerScope(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PartnerScope value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PartnerScope ReadAsPropertyName(
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
            return new PartnerScope(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PartnerScope value,
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
        public const string WorkspacesRead = "workspaces:read";

        public const string WorkspacesWrite = "workspaces:write";

        public const string WorkspacesDelete = "workspaces:delete";
    }
}
