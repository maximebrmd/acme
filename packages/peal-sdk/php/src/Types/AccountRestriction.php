<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class AccountRestriction extends JsonSerializableType
{
    /**
     * @var (
     *    'optionValues'
     *   |'optionFixed'
     *   |'videoDuration'
     *   |'mediaTypesRefused'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    AccountRestrictionOptionValues
     *   |AccountRestrictionOptionFixed
     *   |AccountRestrictionVideoDuration
     *   |AccountRestrictionMediaTypesRefused
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'optionValues'
     *   |'optionFixed'
     *   |'videoDuration'
     *   |'mediaTypesRefused'
     *   |'_unknown'
     * ),
     *   value: (
     *    AccountRestrictionOptionValues
     *   |AccountRestrictionOptionFixed
     *   |AccountRestrictionVideoDuration
     *   |AccountRestrictionMediaTypesRefused
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
     * @param AccountRestrictionOptionValues $optionValues
     * @return AccountRestriction
     */
    public static function optionValues(AccountRestrictionOptionValues $optionValues): AccountRestriction
    {
        return new AccountRestriction([
            'type' => 'optionValues',
            'value' => $optionValues,
        ]);
    }

    /**
     * @param AccountRestrictionOptionFixed $optionFixed
     * @return AccountRestriction
     */
    public static function optionFixed(AccountRestrictionOptionFixed $optionFixed): AccountRestriction
    {
        return new AccountRestriction([
            'type' => 'optionFixed',
            'value' => $optionFixed,
        ]);
    }

    /**
     * @param AccountRestrictionVideoDuration $videoDuration
     * @return AccountRestriction
     */
    public static function videoDuration(AccountRestrictionVideoDuration $videoDuration): AccountRestriction
    {
        return new AccountRestriction([
            'type' => 'videoDuration',
            'value' => $videoDuration,
        ]);
    }

    /**
     * @param AccountRestrictionMediaTypesRefused $mediaTypesRefused
     * @return AccountRestriction
     */
    public static function mediaTypesRefused(AccountRestrictionMediaTypesRefused $mediaTypesRefused): AccountRestriction
    {
        return new AccountRestriction([
            'type' => 'mediaTypesRefused',
            'value' => $mediaTypesRefused,
        ]);
    }

    /**
     * @return bool
     */
    public function isOptionValues(): bool
    {
        return $this->value instanceof AccountRestrictionOptionValues && $this->type === 'optionValues';
    }

    /**
     * @return AccountRestrictionOptionValues
     */
    public function asOptionValues(): AccountRestrictionOptionValues
    {
        if (!($this->value instanceof AccountRestrictionOptionValues && $this->type === 'optionValues')) {
            throw new Exception(
                "Expected optionValues; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOptionFixed(): bool
    {
        return $this->value instanceof AccountRestrictionOptionFixed && $this->type === 'optionFixed';
    }

    /**
     * @return AccountRestrictionOptionFixed
     */
    public function asOptionFixed(): AccountRestrictionOptionFixed
    {
        if (!($this->value instanceof AccountRestrictionOptionFixed && $this->type === 'optionFixed')) {
            throw new Exception(
                "Expected optionFixed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isVideoDuration(): bool
    {
        return $this->value instanceof AccountRestrictionVideoDuration && $this->type === 'videoDuration';
    }

    /**
     * @return AccountRestrictionVideoDuration
     */
    public function asVideoDuration(): AccountRestrictionVideoDuration
    {
        if (!($this->value instanceof AccountRestrictionVideoDuration && $this->type === 'videoDuration')) {
            throw new Exception(
                "Expected videoDuration; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMediaTypesRefused(): bool
    {
        return $this->value instanceof AccountRestrictionMediaTypesRefused && $this->type === 'mediaTypesRefused';
    }

    /**
     * @return AccountRestrictionMediaTypesRefused
     */
    public function asMediaTypesRefused(): AccountRestrictionMediaTypesRefused
    {
        if (!($this->value instanceof AccountRestrictionMediaTypesRefused && $this->type === 'mediaTypesRefused')) {
            throw new Exception(
                "Expected mediaTypesRefused; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'optionValues':
                $value = $this->asOptionValues()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'optionFixed':
                $value = $this->asOptionFixed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'videoDuration':
                $value = $this->asVideoDuration()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'mediaTypesRefused':
                $value = $this->asMediaTypesRefused()->jsonSerialize();
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
            case 'optionValues':
                $args['value'] = AccountRestrictionOptionValues::jsonDeserialize($data);
                break;
            case 'optionFixed':
                $args['value'] = AccountRestrictionOptionFixed::jsonDeserialize($data);
                break;
            case 'videoDuration':
                $args['value'] = AccountRestrictionVideoDuration::jsonDeserialize($data);
                break;
            case 'mediaTypesRefused':
                $args['value'] = AccountRestrictionMediaTypesRefused::jsonDeserialize($data);
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
