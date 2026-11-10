<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class PostWarning extends JsonSerializableType
{
    /**
     * @var (
     *    'channelsDropped'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    PostWarningChannelsDropped
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'channelsDropped'
     *   |'_unknown'
     * ),
     *   value: (
     *    PostWarningChannelsDropped
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
     * @param PostWarningChannelsDropped $channelsDropped
     * @return PostWarning
     */
    public static function channelsDropped(PostWarningChannelsDropped $channelsDropped): PostWarning
    {
        return new PostWarning([
            'type' => 'channelsDropped',
            'value' => $channelsDropped,
        ]);
    }

    /**
     * @return bool
     */
    public function isChannelsDropped(): bool
    {
        return $this->value instanceof PostWarningChannelsDropped && $this->type === 'channelsDropped';
    }

    /**
     * @return PostWarningChannelsDropped
     */
    public function asChannelsDropped(): PostWarningChannelsDropped
    {
        if (!($this->value instanceof PostWarningChannelsDropped && $this->type === 'channelsDropped')) {
            throw new Exception(
                "Expected channelsDropped; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'channelsDropped':
                $value = $this->asChannelsDropped()->jsonSerialize();
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
            case 'channelsDropped':
                $args['value'] = PostWarningChannelsDropped::jsonDeserialize($data);
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
