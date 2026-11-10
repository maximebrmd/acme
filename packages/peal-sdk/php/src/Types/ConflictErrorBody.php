<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConflictErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'ExternalIdTaken'
     *   |'IdempotencyKeyReused'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ExternalIdTakenEncoded
     *   |IdempotencyKeyReusedEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'ExternalIdTaken'
     *   |'IdempotencyKeyReused'
     *   |'_unknown'
     * ),
     *   value: (
     *    ExternalIdTakenEncoded
     *   |IdempotencyKeyReusedEncoded
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->value = $values['value'];
    }

    /**
     * @param ExternalIdTakenEncoded $externalIdTaken
     * @return ConflictErrorBody
     */
    public static function externalIdTaken(ExternalIdTakenEncoded $externalIdTaken): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'ExternalIdTaken',
            'value' => $externalIdTaken,
        ]);
    }

    /**
     * @param IdempotencyKeyReusedEncoded $idempotencyKeyReused
     * @return ConflictErrorBody
     */
    public static function idempotencyKeyReused(IdempotencyKeyReusedEncoded $idempotencyKeyReused): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'IdempotencyKeyReused',
            'value' => $idempotencyKeyReused,
        ]);
    }

    /**
     * @return bool
     */
    public function isExternalIdTaken(): bool
    {
        return $this->value instanceof ExternalIdTakenEncoded && $this->type === 'ExternalIdTaken';
    }

    /**
     * @return ExternalIdTakenEncoded
     */
    public function asExternalIdTaken(): ExternalIdTakenEncoded
    {
        if (!($this->value instanceof ExternalIdTakenEncoded && $this->type === 'ExternalIdTaken')) {
            throw new Exception(
                "Expected ExternalIdTaken; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isIdempotencyKeyReused(): bool
    {
        return $this->value instanceof IdempotencyKeyReusedEncoded && $this->type === 'IdempotencyKeyReused';
    }

    /**
     * @return IdempotencyKeyReusedEncoded
     */
    public function asIdempotencyKeyReused(): IdempotencyKeyReusedEncoded
    {
        if (!($this->value instanceof IdempotencyKeyReusedEncoded && $this->type === 'IdempotencyKeyReused')) {
            throw new Exception(
                "Expected IdempotencyKeyReused; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }

    /**
     * @return array<mixed>
     */
    public function jsonSerialize(): array
    {
        $result = [];
        $result['_tag'] = $this->type;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->type) {
            case 'ExternalIdTaken':
                $value = $this->asExternalIdTaken()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'IdempotencyKeyReused':
                $value = $this->asIdempotencyKeyReused()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case '_unknown':
            default:
                if (is_null($this->value)) {
                    break;
                }
                if ($this->value instanceof JsonSerializableType) {
                    $value = $this->value->jsonSerialize();
                    $result = array_merge($value, $result);
                } elseif (is_array($this->value)) {
                    $result = array_merge($this->value, $result);
                }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function jsonDeserialize(array $data): static
    {
        $args = [];
        if (!array_key_exists('_tag', $data)) {
            throw new Exception(
                "JSON data is missing property '_tag'",
            );
        }
        $type = $data['_tag'];
        if (!(is_string($type))) {
            throw new Exception(
                "Expected property 'type' in JSON data to be string, instead received " . get_debug_type($data['_tag']),
            );
        }

        $args['type'] = $type;
        switch ($type) {
            case 'ExternalIdTaken':
                $args['value'] = ExternalIdTakenEncoded::jsonDeserialize($data);
                break;
            case 'IdempotencyKeyReused':
                $args['value'] = IdempotencyKeyReusedEncoded::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['type'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
