<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class BulkPostResult extends JsonSerializableType
{
    /**
     * @var (
     *    'created'
     *   |'refused'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    BulkPostResultCreated
     *   |BulkPostResultRefused
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'created'
     *   |'refused'
     *   |'_unknown'
     * ),
     *   value: (
     *    BulkPostResultCreated
     *   |BulkPostResultRefused
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
     * @param BulkPostResultCreated $created
     * @return BulkPostResult
     */
    public static function created(BulkPostResultCreated $created): BulkPostResult
    {
        return new BulkPostResult([
            'type' => 'created',
            'value' => $created,
        ]);
    }

    /**
     * @param BulkPostResultRefused $refused
     * @return BulkPostResult
     */
    public static function refused(BulkPostResultRefused $refused): BulkPostResult
    {
        return new BulkPostResult([
            'type' => 'refused',
            'value' => $refused,
        ]);
    }

    /**
     * @return bool
     */
    public function isCreated(): bool
    {
        return $this->value instanceof BulkPostResultCreated && $this->type === 'created';
    }

    /**
     * @return BulkPostResultCreated
     */
    public function asCreated(): BulkPostResultCreated
    {
        if (!($this->value instanceof BulkPostResultCreated && $this->type === 'created')) {
            throw new Exception(
                "Expected created; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRefused(): bool
    {
        return $this->value instanceof BulkPostResultRefused && $this->type === 'refused';
    }

    /**
     * @return BulkPostResultRefused
     */
    public function asRefused(): BulkPostResultRefused
    {
        if (!($this->value instanceof BulkPostResultRefused && $this->type === 'refused')) {
            throw new Exception(
                "Expected refused; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'refused':
                $value = $this->asRefused()->jsonSerialize();
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
                $args['value'] = BulkPostResultCreated::jsonDeserialize($data);
                break;
            case 'refused':
                $args['value'] = BulkPostResultRefused::jsonDeserialize($data);
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
