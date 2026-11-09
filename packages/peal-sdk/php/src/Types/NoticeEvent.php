<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class NoticeEvent extends JsonSerializableType
{
    /**
     * @var (
     *    'PostPublished'
     *   |'PostFailed'
     *   |'PostUnconfirmed'
     *   |'ChannelReconnectRequired'
     *   |'ChannelReconnectSoon'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    NoticeEventPostPublished
     *   |NoticeEventPostFailed
     *   |NoticeEventPostUnconfirmed
     *   |NoticeEventChannelReconnectRequired
     *   |NoticeEventChannelReconnectSoon
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'PostPublished'
     *   |'PostFailed'
     *   |'PostUnconfirmed'
     *   |'ChannelReconnectRequired'
     *   |'ChannelReconnectSoon'
     *   |'_unknown'
     * ),
     *   value: (
     *    NoticeEventPostPublished
     *   |NoticeEventPostFailed
     *   |NoticeEventPostUnconfirmed
     *   |NoticeEventChannelReconnectRequired
     *   |NoticeEventChannelReconnectSoon
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
     * @param NoticeEventPostPublished $postPublished
     * @return NoticeEvent
     */
    public static function postPublished(NoticeEventPostPublished $postPublished): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostPublished',
            'value' => $postPublished,
        ]);
    }

    /**
     * @param NoticeEventPostFailed $postFailed
     * @return NoticeEvent
     */
    public static function postFailed(NoticeEventPostFailed $postFailed): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostFailed',
            'value' => $postFailed,
        ]);
    }

    /**
     * @param NoticeEventPostUnconfirmed $postUnconfirmed
     * @return NoticeEvent
     */
    public static function postUnconfirmed(NoticeEventPostUnconfirmed $postUnconfirmed): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostUnconfirmed',
            'value' => $postUnconfirmed,
        ]);
    }

    /**
     * @param NoticeEventChannelReconnectRequired $channelReconnectRequired
     * @return NoticeEvent
     */
    public static function channelReconnectRequired(NoticeEventChannelReconnectRequired $channelReconnectRequired): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'ChannelReconnectRequired',
            'value' => $channelReconnectRequired,
        ]);
    }

    /**
     * @param NoticeEventChannelReconnectSoon $channelReconnectSoon
     * @return NoticeEvent
     */
    public static function channelReconnectSoon(NoticeEventChannelReconnectSoon $channelReconnectSoon): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'ChannelReconnectSoon',
            'value' => $channelReconnectSoon,
        ]);
    }

    /**
     * @return bool
     */
    public function isPostPublished(): bool
    {
        return $this->value instanceof NoticeEventPostPublished && $this->type === 'PostPublished';
    }

    /**
     * @return NoticeEventPostPublished
     */
    public function asPostPublished(): NoticeEventPostPublished
    {
        if (!($this->value instanceof NoticeEventPostPublished && $this->type === 'PostPublished')) {
            throw new Exception(
                "Expected PostPublished; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostFailed(): bool
    {
        return $this->value instanceof NoticeEventPostFailed && $this->type === 'PostFailed';
    }

    /**
     * @return NoticeEventPostFailed
     */
    public function asPostFailed(): NoticeEventPostFailed
    {
        if (!($this->value instanceof NoticeEventPostFailed && $this->type === 'PostFailed')) {
            throw new Exception(
                "Expected PostFailed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostUnconfirmed(): bool
    {
        return $this->value instanceof NoticeEventPostUnconfirmed && $this->type === 'PostUnconfirmed';
    }

    /**
     * @return NoticeEventPostUnconfirmed
     */
    public function asPostUnconfirmed(): NoticeEventPostUnconfirmed
    {
        if (!($this->value instanceof NoticeEventPostUnconfirmed && $this->type === 'PostUnconfirmed')) {
            throw new Exception(
                "Expected PostUnconfirmed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isChannelReconnectRequired(): bool
    {
        return $this->value instanceof NoticeEventChannelReconnectRequired && $this->type === 'ChannelReconnectRequired';
    }

    /**
     * @return NoticeEventChannelReconnectRequired
     */
    public function asChannelReconnectRequired(): NoticeEventChannelReconnectRequired
    {
        if (!($this->value instanceof NoticeEventChannelReconnectRequired && $this->type === 'ChannelReconnectRequired')) {
            throw new Exception(
                "Expected ChannelReconnectRequired; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isChannelReconnectSoon(): bool
    {
        return $this->value instanceof NoticeEventChannelReconnectSoon && $this->type === 'ChannelReconnectSoon';
    }

    /**
     * @return NoticeEventChannelReconnectSoon
     */
    public function asChannelReconnectSoon(): NoticeEventChannelReconnectSoon
    {
        if (!($this->value instanceof NoticeEventChannelReconnectSoon && $this->type === 'ChannelReconnectSoon')) {
            throw new Exception(
                "Expected ChannelReconnectSoon; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'PostPublished':
                $value = $this->asPostPublished()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostFailed':
                $value = $this->asPostFailed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostUnconfirmed':
                $value = $this->asPostUnconfirmed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ChannelReconnectRequired':
                $value = $this->asChannelReconnectRequired()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ChannelReconnectSoon':
                $value = $this->asChannelReconnectSoon()->jsonSerialize();
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
            case 'PostPublished':
                $args['value'] = NoticeEventPostPublished::jsonDeserialize($data);
                break;
            case 'PostFailed':
                $args['value'] = NoticeEventPostFailed::jsonDeserialize($data);
                break;
            case 'PostUnconfirmed':
                $args['value'] = NoticeEventPostUnconfirmed::jsonDeserialize($data);
                break;
            case 'ChannelReconnectRequired':
                $args['value'] = NoticeEventChannelReconnectRequired::jsonDeserialize($data);
                break;
            case 'ChannelReconnectSoon':
                $args['value'] = NoticeEventChannelReconnectSoon::jsonDeserialize($data);
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
