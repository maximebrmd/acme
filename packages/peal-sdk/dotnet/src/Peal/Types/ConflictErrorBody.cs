// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ConflictErrorBody.JsonConverter))]
[Serializable]
public record ConflictErrorBody
{
    internal ConflictErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.AlreadyMember"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.AlreadyMember value)
    {
        Type = "AlreadyMember";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.TooManyInvitations"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.TooManyInvitations value)
    {
        Type = "TooManyInvitations";
        Value = value.Value;
    }

    /// <summary>
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("_tag")]
    public string Type { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Type"/> is "AlreadyMember"
    /// </summary>
    public bool IsAlreadyMember => Type == "AlreadyMember";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TooManyInvitations"
    /// </summary>
    public bool IsTooManyInvitations => Type == "TooManyInvitations";

    /// <summary>
    /// Returns the value as a <see cref="Peal.AlreadyMemberEncoded"/> if <see cref="Type"/> is 'AlreadyMember', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'AlreadyMember'.</exception>
    public Peal.AlreadyMemberEncoded AsAlreadyMember() =>
        IsAlreadyMember
            ? (Peal.AlreadyMemberEncoded)Value!
            : throw new global::System.Exception("ConflictErrorBody.Type is not 'AlreadyMember'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyInvitationsEncoded"/> if <see cref="Type"/> is 'TooManyInvitations', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyInvitations'.</exception>
    public Peal.TooManyInvitationsEncoded AsTooManyInvitations() =>
        IsTooManyInvitations
            ? (Peal.TooManyInvitationsEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'TooManyInvitations'"
            );

    public T Match<T>(
        Func<Peal.AlreadyMemberEncoded, T> onAlreadyMember,
        Func<Peal.TooManyInvitationsEncoded, T> onTooManyInvitations,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "AlreadyMember" => onAlreadyMember(AsAlreadyMember()),
            "TooManyInvitations" => onTooManyInvitations(AsTooManyInvitations()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.AlreadyMemberEncoded> onAlreadyMember,
        Action<Peal.TooManyInvitationsEncoded> onTooManyInvitations,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "AlreadyMember":
                onAlreadyMember(AsAlreadyMember());
                break;
            case "TooManyInvitations":
                onTooManyInvitations(AsTooManyInvitations());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AlreadyMemberEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsAlreadyMember(out Peal.AlreadyMemberEncoded? value)
    {
        if (Type == "AlreadyMember")
        {
            value = (Peal.AlreadyMemberEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyInvitationsEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyInvitations(out Peal.TooManyInvitationsEncoded? value)
    {
        if (Type == "TooManyInvitations")
        {
            value = (Peal.TooManyInvitationsEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.AlreadyMember value) =>
        new(value);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.TooManyInvitations value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ConflictErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ConflictErrorBody).IsAssignableFrom(typeToConvert);

        public override ConflictErrorBody Read(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var json = JsonElement.ParseValue(ref reader);
            if (!json.TryGetProperty("_tag", out var discriminatorElement))
            {
                throw new JsonException("Missing discriminator property '_tag'");
            }
            if (discriminatorElement.ValueKind != JsonValueKind.String)
            {
                if (discriminatorElement.ValueKind == JsonValueKind.Null)
                {
                    throw new JsonException("Discriminator property '_tag' is null");
                }

                throw new JsonException(
                    $"Discriminator property '_tag' is not a string, instead is {discriminatorElement.ToString()}"
                );
            }

            var discriminator =
                discriminatorElement.GetString()
                ?? throw new JsonException("Discriminator property '_tag' is null");

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("_tag");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "AlreadyMember" => jsonWithoutDiscriminator.Deserialize<Peal.AlreadyMemberEncoded?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.AlreadyMemberEncoded"),
                "TooManyInvitations" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TooManyInvitationsEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TooManyInvitationsEncoded"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new ConflictErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ConflictErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "AlreadyMember" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TooManyInvitations" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ConflictErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ConflictErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ConflictErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for AlreadyMember
    /// </summary>
    [Serializable]
    public struct AlreadyMember
    {
        public AlreadyMember(Peal.AlreadyMemberEncoded value)
        {
            Value = value;
        }

        internal Peal.AlreadyMemberEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.AlreadyMember(
            Peal.AlreadyMemberEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TooManyInvitations
    /// </summary>
    [Serializable]
    public struct TooManyInvitations
    {
        public TooManyInvitations(Peal.TooManyInvitationsEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyInvitationsEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.TooManyInvitations(
            Peal.TooManyInvitationsEncoded value
        ) => new(value);
    }
}
