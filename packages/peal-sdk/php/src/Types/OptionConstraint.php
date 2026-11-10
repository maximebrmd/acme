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
     *   |'neededWith'
     *   |'onlyWith'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    OptionConstraintNeedsOneOf
     *   |OptionConstraintNotWith
     *   |OptionConstraintNeededWith
     *   |OptionConstraintOnlyWith
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'needsOneOf'
     *   |'notWith'
     *   |'neededWith'
     *   |'onlyWith'
     *   |'_unknown'
     * ),
     *   value: (
     *    OptionConstraintNeedsOneOf
     *   |OptionConstraintNotWith
     *   |OptionConstraintNeededWith
     *   |OptionConstraintOnlyWith
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
     * @param OptionConstraintNeededWith $neededWith
     * @return OptionConstraint
     */
    public static function neededWith(OptionConstraintNeededWith $neededWith): OptionConstraint
    {
        return new OptionConstraint([
            'type' => 'neededWith',
            'value' => $neededWith,
        ]);
    }

    /**
     * @param OptionConstraintOnlyWith $onlyWith
     * @return OptionConstraint
     */
    public static function onlyWith(OptionConstraintOnlyWith $onlyWith): OptionConstraint
    {
        return new OptionConstraint([
            'type' => 'onlyWith',
            'value' => $onlyWith,
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
     * @return bool
     */
    public function isNeededWith(): bool
    {
        return $this->value instanceof OptionConstraintNeededWith && $this->type === 'neededWith';
    }

    /**
     * @return OptionConstraintNeededWith
     */
    public function asNeededWith(): OptionConstraintNeededWith
    {
        if (!($this->value instanceof OptionConstraintNeededWith && $this->type === 'neededWith')) {
            throw new Exception(
                "Expected neededWith; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isOnlyWith(): bool
    {
        return $this->value instanceof OptionConstraintOnlyWith && $this->type === 'onlyWith';
    }

    /**
     * @return OptionConstraintOnlyWith
     */
    public function asOnlyWith(): OptionConstraintOnlyWith
    {
        if (!($this->value instanceof OptionConstraintOnlyWith && $this->type === 'onlyWith')) {
            throw new Exception(
                "Expected onlyWith; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'neededWith':
                $value = $this->asNeededWith()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'onlyWith':
                $value = $this->asOnlyWith()->jsonSerialize();
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
            case 'neededWith':
                $args['value'] = OptionConstraintNeededWith::jsonDeserialize($data);
                break;
            case 'onlyWith':
                $args['value'] = OptionConstraintOnlyWith::jsonDeserialize($data);
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
