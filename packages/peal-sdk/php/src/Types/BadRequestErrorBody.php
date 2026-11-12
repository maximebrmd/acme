<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class BadRequestErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'BadRequest'
     *   |'InvalidDateRange'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    EffectHttpApiErrorBadRequestEncoded
     *   |InvalidDateRangeEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'BadRequest'
     *   |'InvalidDateRange'
     *   |'_unknown'
     * ),
     *   value: (
     *    EffectHttpApiErrorBadRequestEncoded
     *   |InvalidDateRangeEncoded
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
     * @param InvalidDateRangeEncoded $invalidDateRange
     * @return BadRequestErrorBody
     */
    public static function invalidDateRange(InvalidDateRangeEncoded $invalidDateRange): BadRequestErrorBody
    {
        return new BadRequestErrorBody([
            'type' => 'InvalidDateRange',
            'value' => $invalidDateRange,
        ]);
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
     * @return bool
     */
    public function isInvalidDateRange(): bool
    {
        return $this->value instanceof InvalidDateRangeEncoded && $this->type === 'InvalidDateRange';
    }

    /**
     * @return InvalidDateRangeEncoded
     */
    public function asInvalidDateRange(): InvalidDateRangeEncoded
    {
        if (!($this->value instanceof InvalidDateRangeEncoded && $this->type === 'InvalidDateRange')) {
            throw new Exception(
                "Expected InvalidDateRange; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'BadRequest':
                $value = $this->asBadRequest()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'InvalidDateRange':
                $value = $this->asInvalidDateRange()->jsonSerialize();
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
            case 'BadRequest':
                $args['value'] = EffectHttpApiErrorBadRequestEncoded::jsonDeserialize($data);
                break;
            case 'InvalidDateRange':
                $args['value'] = InvalidDateRangeEncoded::jsonDeserialize($data);
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
