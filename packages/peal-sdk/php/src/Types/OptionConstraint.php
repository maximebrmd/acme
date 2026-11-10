<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class OptionConstraint extends JsonSerializableType
{
    /**
     * @var (
     *    'needsOneOf'
     *   |'notWith'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    OptionConstraintNeedsOneOf
     *   |OptionConstraintNotWith
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'needsOneOf'
     *   |'notWith'
     *   |'_unknown'
     * ),
     *   value: (
     *    OptionConstraintNeedsOneOf
     *   |OptionConstraintNotWith
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
     * @param OptionConstraintNeedsOneOf $needsOneOf
     * @return OptionConstraint
     */
    public static function needsOneOf(OptionConstraintNeedsOneOf $needsOneOf): OptionConstraint
    {
        return new OptionConstraint([
            'type' => 'needsOneOf',
            'value' => $needsOneOf,
        ]);
    }

    /**
     * @param OptionConstraintNotWith $notWith
     * @return OptionConstraint
     */
    public static function notWith(OptionConstraintNotWith $notWith): OptionConstraint
    {
        return new OptionConstraint([
            'type' => 'notWith',
            'value' => $notWith,
        ]);
    }

    /**
     * @return bool
     */
    public function isNeedsOneOf(): bool
    {
        return $this->value instanceof OptionConstraintNeedsOneOf && $this->type === 'needsOneOf';
    }

    /**
     * @return OptionConstraintNeedsOneOf
     */
    public function asNeedsOneOf(): OptionConstraintNeedsOneOf
    {
        if (!($this->value instanceof OptionConstraintNeedsOneOf && $this->type === 'needsOneOf')) {
            throw new Exception(
                "Expected needsOneOf; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isNotWith(): bool
    {
        return $this->value instanceof OptionConstraintNotWith && $this->type === 'notWith';
    }

    /**
     * @return OptionConstraintNotWith
     */
    public function asNotWith(): OptionConstraintNotWith
    {
        if (!($this->value instanceof OptionConstraintNotWith && $this->type === 'notWith')) {
            throw new Exception(
                "Expected notWith; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'needsOneOf':
                $value = $this->asNeedsOneOf()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'notWith':
                $value = $this->asNotWith()->jsonSerialize();
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
            case 'needsOneOf':
                $args['value'] = OptionConstraintNeedsOneOf::jsonDeserialize($data);
                break;
            case 'notWith':
                $args['value'] = OptionConstraintNotWith::jsonDeserialize($data);
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
