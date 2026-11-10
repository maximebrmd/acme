<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class PostTiming extends JsonSerializableType
{
    /**
     * @var (
     *    'now'
     *   |'at'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    PostTimingNow
     *   |PostTimingAt
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'now'
     *   |'at'
     *   |'_unknown'
     * ),
     *   value: (
     *    PostTimingNow
     *   |PostTimingAt
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
     * @param PostTimingNow $now
     * @return PostTiming
     */
    public static function now(PostTimingNow $now): PostTiming
    {
        return new PostTiming([
            'type' => 'now',
            'value' => $now,
        ]);
    }

    /**
     * @param PostTimingAt $at
     * @return PostTiming
     */
    public static function at(PostTimingAt $at): PostTiming
    {
        return new PostTiming([
            'type' => 'at',
            'value' => $at,
        ]);
    }

    /**
     * @return bool
     */
    public function isNow(): bool
    {
        return $this->value instanceof PostTimingNow && $this->type === 'now';
    }

    /**
     * @return PostTimingNow
     */
    public function asNow(): PostTimingNow
    {
        if (!($this->value instanceof PostTimingNow && $this->type === 'now')) {
            throw new Exception(
                "Expected now; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAt(): bool
    {
        return $this->value instanceof PostTimingAt && $this->type === 'at';
    }

    /**
     * @return PostTimingAt
     */
    public function asAt(): PostTimingAt
    {
        if (!($this->value instanceof PostTimingAt && $this->type === 'at')) {
            throw new Exception(
                "Expected at; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'now':
                $value = $this->asNow()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'at':
                $value = $this->asAt()->jsonSerialize();
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
            case 'now':
                $args['value'] = PostTimingNow::jsonDeserialize($data);
                break;
            case 'at':
                $args['value'] = PostTimingAt::jsonDeserialize($data);
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
