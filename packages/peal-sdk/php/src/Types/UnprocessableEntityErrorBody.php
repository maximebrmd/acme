<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class UnprocessableEntityErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'RecyclingEndsTooSoon'
     *   |'RecyclingVariantsInvalid'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    RecyclingEndsTooSoonEncoded
     *   |RecyclingVariantsInvalidEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'RecyclingEndsTooSoon'
     *   |'RecyclingVariantsInvalid'
     *   |'_unknown'
     * ),
     *   value: (
     *    RecyclingEndsTooSoonEncoded
     *   |RecyclingVariantsInvalidEncoded
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
     * @param RecyclingEndsTooSoonEncoded $recyclingEndsTooSoon
     * @return UnprocessableEntityErrorBody
     */
    public static function recyclingEndsTooSoon(RecyclingEndsTooSoonEncoded $recyclingEndsTooSoon): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'RecyclingEndsTooSoon',
            'value' => $recyclingEndsTooSoon,
        ]);
    }

    /**
     * @param RecyclingVariantsInvalidEncoded $recyclingVariantsInvalid
     * @return UnprocessableEntityErrorBody
     */
    public static function recyclingVariantsInvalid(RecyclingVariantsInvalidEncoded $recyclingVariantsInvalid): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'RecyclingVariantsInvalid',
            'value' => $recyclingVariantsInvalid,
        ]);
    }

    /**
     * @return bool
     */
    public function isRecyclingEndsTooSoon(): bool
    {
        return $this->value instanceof RecyclingEndsTooSoonEncoded && $this->type === 'RecyclingEndsTooSoon';
    }

    /**
     * @return RecyclingEndsTooSoonEncoded
     */
    public function asRecyclingEndsTooSoon(): RecyclingEndsTooSoonEncoded
    {
        if (!($this->value instanceof RecyclingEndsTooSoonEncoded && $this->type === 'RecyclingEndsTooSoon')) {
            throw new Exception(
                "Expected RecyclingEndsTooSoon; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRecyclingVariantsInvalid(): bool
    {
        return $this->value instanceof RecyclingVariantsInvalidEncoded && $this->type === 'RecyclingVariantsInvalid';
    }

    /**
     * @return RecyclingVariantsInvalidEncoded
     */
    public function asRecyclingVariantsInvalid(): RecyclingVariantsInvalidEncoded
    {
        if (!($this->value instanceof RecyclingVariantsInvalidEncoded && $this->type === 'RecyclingVariantsInvalid')) {
            throw new Exception(
                "Expected RecyclingVariantsInvalid; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'RecyclingEndsTooSoon':
                $value = $this->asRecyclingEndsTooSoon()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'RecyclingVariantsInvalid':
                $value = $this->asRecyclingVariantsInvalid()->jsonSerialize();
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
            case 'RecyclingEndsTooSoon':
                $args['value'] = RecyclingEndsTooSoonEncoded::jsonDeserialize($data);
                break;
            case 'RecyclingVariantsInvalid':
                $args['value'] = RecyclingVariantsInvalidEncoded::jsonDeserialize($data);
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
