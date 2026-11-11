<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class UnprocessableEntityErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'UnknownChannels'
     *   |'InvalidTimeZone'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    UnknownChannelsEncoded
     *   |InvalidTimeZoneEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'UnknownChannels'
     *   |'InvalidTimeZone'
     *   |'_unknown'
     * ),
     *   value: (
     *    UnknownChannelsEncoded
     *   |InvalidTimeZoneEncoded
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
     * @param UnknownChannelsEncoded $unknownChannels
     * @return UnprocessableEntityErrorBody
     */
    public static function unknownChannels(UnknownChannelsEncoded $unknownChannels): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'UnknownChannels',
            'value' => $unknownChannels,
        ]);
    }

    /**
     * @param InvalidTimeZoneEncoded $invalidTimeZone
     * @return UnprocessableEntityErrorBody
     */
    public static function invalidTimeZone(InvalidTimeZoneEncoded $invalidTimeZone): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'InvalidTimeZone',
            'value' => $invalidTimeZone,
        ]);
    }

    /**
     * @return bool
     */
    public function isUnknownChannels(): bool
    {
        return $this->value instanceof UnknownChannelsEncoded && $this->type === 'UnknownChannels';
    }

    /**
     * @return UnknownChannelsEncoded
     */
    public function asUnknownChannels(): UnknownChannelsEncoded
    {
        if (!($this->value instanceof UnknownChannelsEncoded && $this->type === 'UnknownChannels')) {
            throw new Exception(
                "Expected UnknownChannels; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isInvalidTimeZone(): bool
    {
        return $this->value instanceof InvalidTimeZoneEncoded && $this->type === 'InvalidTimeZone';
    }

    /**
     * @return InvalidTimeZoneEncoded
     */
    public function asInvalidTimeZone(): InvalidTimeZoneEncoded
    {
        if (!($this->value instanceof InvalidTimeZoneEncoded && $this->type === 'InvalidTimeZone')) {
            throw new Exception(
                "Expected InvalidTimeZone; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'UnknownChannels':
                $value = $this->asUnknownChannels()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'InvalidTimeZone':
                $value = $this->asInvalidTimeZone()->jsonSerialize();
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
            case 'UnknownChannels':
                $args['value'] = UnknownChannelsEncoded::jsonDeserialize($data);
                break;
            case 'InvalidTimeZone':
                $args['value'] = InvalidTimeZoneEncoded::jsonDeserialize($data);
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
