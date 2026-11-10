<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ImportRowResult extends JsonSerializableType
{
    /**
     * @var (
     *    'created'
     *   |'valid'
     *   |'refused'
     *   |'unreadable'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ImportRowResultCreated
     *   |ImportRowResultValid
     *   |ImportRowResultRefused
     *   |ImportRowResultUnreadable
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'created'
     *   |'valid'
     *   |'refused'
     *   |'unreadable'
     *   |'_unknown'
     * ),
     *   value: (
     *    ImportRowResultCreated
     *   |ImportRowResultValid
     *   |ImportRowResultRefused
     *   |ImportRowResultUnreadable
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
     * @param ImportRowResultCreated $created
     * @return ImportRowResult
     */
    public static function created(ImportRowResultCreated $created): ImportRowResult
    {
        return new ImportRowResult([
            'type' => 'created',
            'value' => $created,
        ]);
    }

    /**
     * @param ImportRowResultValid $valid
     * @return ImportRowResult
     */
    public static function valid(ImportRowResultValid $valid): ImportRowResult
    {
        return new ImportRowResult([
            'type' => 'valid',
            'value' => $valid,
        ]);
    }

    /**
     * @param ImportRowResultRefused $refused
     * @return ImportRowResult
     */
    public static function refused(ImportRowResultRefused $refused): ImportRowResult
    {
        return new ImportRowResult([
            'type' => 'refused',
            'value' => $refused,
        ]);
    }

    /**
     * @param ImportRowResultUnreadable $unreadable
     * @return ImportRowResult
     */
    public static function unreadable(ImportRowResultUnreadable $unreadable): ImportRowResult
    {
        return new ImportRowResult([
            'type' => 'unreadable',
            'value' => $unreadable,
        ]);
    }

    /**
     * @return bool
     */
    public function isCreated(): bool
    {
        return $this->value instanceof ImportRowResultCreated && $this->type === 'created';
    }

    /**
     * @return ImportRowResultCreated
     */
    public function asCreated(): ImportRowResultCreated
    {
        if (!($this->value instanceof ImportRowResultCreated && $this->type === 'created')) {
            throw new Exception(
                "Expected created; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isValid(): bool
    {
        return $this->value instanceof ImportRowResultValid && $this->type === 'valid';
    }

    /**
     * @return ImportRowResultValid
     */
    public function asValid(): ImportRowResultValid
    {
        if (!($this->value instanceof ImportRowResultValid && $this->type === 'valid')) {
            throw new Exception(
                "Expected valid; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRefused(): bool
    {
        return $this->value instanceof ImportRowResultRefused && $this->type === 'refused';
    }

    /**
     * @return ImportRowResultRefused
     */
    public function asRefused(): ImportRowResultRefused
    {
        if (!($this->value instanceof ImportRowResultRefused && $this->type === 'refused')) {
            throw new Exception(
                "Expected refused; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUnreadable(): bool
    {
        return $this->value instanceof ImportRowResultUnreadable && $this->type === 'unreadable';
    }

    /**
     * @return ImportRowResultUnreadable
     */
    public function asUnreadable(): ImportRowResultUnreadable
    {
        if (!($this->value instanceof ImportRowResultUnreadable && $this->type === 'unreadable')) {
            throw new Exception(
                "Expected unreadable; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'created':
                $value = $this->asCreated()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'valid':
                $value = $this->asValid()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'refused':
                $value = $this->asRefused()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'unreadable':
                $value = $this->asUnreadable()->jsonSerialize();
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
            case 'created':
                $args['value'] = ImportRowResultCreated::jsonDeserialize($data);
                break;
            case 'valid':
                $args['value'] = ImportRowResultValid::jsonDeserialize($data);
                break;
            case 'refused':
                $args['value'] = ImportRowResultRefused::jsonDeserialize($data);
                break;
            case 'unreadable':
                $args['value'] = ImportRowResultUnreadable::jsonDeserialize($data);
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
