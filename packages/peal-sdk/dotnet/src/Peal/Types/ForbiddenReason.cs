using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ForbiddenReason.ForbiddenReasonSerializer))]
[Serializable]
public readonly record struct ForbiddenReason : IStringEnum
{
    public static readonly ForbiddenReason MissingScope = new(Values.MissingScope);

    public static readonly ForbiddenReason MissingPermission = new(Values.MissingPermission);

    public static readonly ForbiddenReason PersonRequired = new(Values.PersonRequired);

    public static readonly ForbiddenReason WrongWorkspace = new(Values.WrongWorkspace);

    public static readonly ForbiddenReason Suspended = new(Values.Suspended);

    public static readonly ForbiddenReason UntrustedOrigin = new(Values.UntrustedOrigin);

    public ForbiddenReason(string value)
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
    public static ForbiddenReason FromCustom(string value)
    {
        return new ForbiddenReason(value);
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

    public static bool operator ==(ForbiddenReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ForbiddenReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ForbiddenReason value) => value.Value;

    public static explicit operator ForbiddenReason(string value) => new(value);

    internal class ForbiddenReasonSerializer : JsonConverter<ForbiddenReason>
    {
        public override ForbiddenReason Read(
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
            return new ForbiddenReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ForbiddenReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ForbiddenReason ReadAsPropertyName(
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
            return new ForbiddenReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ForbiddenReason value,
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
        public const string MissingScope = "missingScope";

        public const string MissingPermission = "missingPermission";

        public const string PersonRequired = "personRequired";

        public const string WrongWorkspace = "wrongWorkspace";

        public const string Suspended = "suspended";

        public const string UntrustedOrigin = "untrustedOrigin";
    }
}
