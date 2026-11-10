<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class BadRequestErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'InvalidTimeRange'
     *   |'BadRequest'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    InvalidTimeRangeEncoded
     *   |EffectHttpApiErrorBadRequestEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'InvalidTimeRange'
     *   |'BadRequest'
     *   |'_unknown'
     * ),
     *   value: (
     *    InvalidTimeRangeEncoded
     *   |EffectHttpApiErrorBadRequestEncoded
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
     * @param InvalidTimeRangeEncoded $invalidTimeRange
     * @return BadRequestErrorBody
     */
    public static function invalidTimeRange(InvalidTimeRangeEncoded $invalidTimeRange): BadRequestErrorBody
    {
        return new BadRequestErrorBody([
            'type' => 'InvalidTimeRange',
            'value' => $invalidTimeRange,
        ]);
    }

    /**
     * @param EffectHttpApiErrorBadRequestEncoded $badRequest
     * @return BadRequestErrorBody
     */
    public static function badRequest(EffectHttpApiErrorBadRequestEncoded $badRequest): BadRequestErrorBody
    {
        return new BadRequestErrorBody([
            'type' => 'BadRequest',
            'value' => $badRequest,
        ]);
    }

    /**
     * @return bool
     */
    public function isInvalidTimeRange(): bool
    {
        return $this->value instanceof InvalidTimeRangeEncoded && $this->type === 'InvalidTimeRange';
    }

    /**
     * @return InvalidTimeRangeEncoded
     */
    public function asInvalidTimeRange(): InvalidTimeRangeEncoded
    {
        if (!($this->value instanceof InvalidTimeRangeEncoded && $this->type === 'InvalidTimeRange')) {
            throw new Exception(
                "Expected InvalidTimeRange; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isBadRequest(): bool
    {
        return $this->value instanceof EffectHttpApiErrorBadRequestEncoded && $this->type === 'BadRequest';
    }

    /**
     * @return EffectHttpApiErrorBadRequestEncoded
     */
    public function asBadRequest(): EffectHttpApiErrorBadRequestEncoded
    {
        if (!($this->value instanceof EffectHttpApiErrorBadRequestEncoded && $this->type === 'BadRequest')) {
            throw new Exception(
                "Expected BadRequest; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'InvalidTimeRange':
                $value = $this->asInvalidTimeRange()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'BadRequest':
                $value = $this->asBadRequest()->jsonSerialize();
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
            case 'InvalidTimeRange':
                $args['value'] = InvalidTimeRangeEncoded::jsonDeserialize($data);
                break;
            case 'BadRequest':
                $args['value'] = EffectHttpApiErrorBadRequestEncoded::jsonDeserialize($data);
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
