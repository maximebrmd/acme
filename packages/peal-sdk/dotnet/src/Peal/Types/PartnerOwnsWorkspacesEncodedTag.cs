using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PartnerOwnsWorkspacesEncodedTag.PartnerOwnsWorkspacesEncodedTagSerializer))]
[Serializable]
public readonly record struct PartnerOwnsWorkspacesEncodedTag : IStringEnum
{
    public static readonly PartnerOwnsWorkspacesEncodedTag PartnerOwnsWorkspaces = new(
        Values.PartnerOwnsWorkspaces
    );

    public PartnerOwnsWorkspacesEncodedTag(string value)
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
    public static PartnerOwnsWorkspacesEncodedTag FromCustom(string value)
    {
        return new PartnerOwnsWorkspacesEncodedTag(value);
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

    public static bool operator ==(PartnerOwnsWorkspacesEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PartnerOwnsWorkspacesEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PartnerOwnsWorkspacesEncodedTag value) => value.Value;

    public static explicit operator PartnerOwnsWorkspacesEncodedTag(string value) => new(value);

    internal class PartnerOwnsWorkspacesEncodedTagSerializer
        : JsonConverter<PartnerOwnsWorkspacesEncodedTag>
    {
        public override PartnerOwnsWorkspacesEncodedTag Read(
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
            return new PartnerOwnsWorkspacesEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PartnerOwnsWorkspacesEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PartnerOwnsWorkspacesEncodedTag ReadAsPropertyName(
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
            return new PartnerOwnsWorkspacesEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PartnerOwnsWorkspacesEncodedTag value,
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
        public const string PartnerOwnsWorkspaces = "PartnerOwnsWorkspaces";
    }
}
