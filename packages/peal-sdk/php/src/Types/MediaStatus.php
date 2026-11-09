<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class MediaStatus extends JsonSerializableType
{
    /**
     * @var (
     *    'pending'
     *   |'uploaded'
     *   |'ready'
     *   |'rejected'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    MediaStatusPending
     *   |MediaStatusUploaded
     *   |MediaStatusReady
     *   |MediaStatusRejected
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'pending'
     *   |'uploaded'
     *   |'ready'
     *   |'rejected'
     *   |'_unknown'
     * ),
     *   value: (
     *    MediaStatusPending
     *   |MediaStatusUploaded
     *   |MediaStatusReady
     *   |MediaStatusRejected
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
     * @param MediaStatusPending $pending
     * @return MediaStatus
     */
    public static function pending(MediaStatusPending $pending): MediaStatus
    {
        return new MediaStatus([
            'type' => 'pending',
            'value' => $pending,
        ]);
    }

    /**
     * @param MediaStatusUploaded $uploaded
     * @return MediaStatus
     */
    public static function uploaded(MediaStatusUploaded $uploaded): MediaStatus
    {
        return new MediaStatus([
            'type' => 'uploaded',
            'value' => $uploaded,
        ]);
    }

    /**
     * @param MediaStatusReady $ready
     * @return MediaStatus
     */
    public static function ready(MediaStatusReady $ready): MediaStatus
    {
        return new MediaStatus([
            'type' => 'ready',
            'value' => $ready,
        ]);
    }

    /**
     * @param MediaStatusRejected $rejected
     * @return MediaStatus
     */
    public static function rejected(MediaStatusRejected $rejected): MediaStatus
    {
        return new MediaStatus([
            'type' => 'rejected',
            'value' => $rejected,
        ]);
    }

    /**
     * @return bool
     */
    public function isPending(): bool
    {
        return $this->value instanceof MediaStatusPending && $this->type === 'pending';
    }

    /**
     * @return MediaStatusPending
     */
    public function asPending(): MediaStatusPending
    {
        if (!($this->value instanceof MediaStatusPending && $this->type === 'pending')) {
            throw new Exception(
                "Expected pending; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUploaded(): bool
    {
        return $this->value instanceof MediaStatusUploaded && $this->type === 'uploaded';
    }

    /**
     * @return MediaStatusUploaded
     */
    public function asUploaded(): MediaStatusUploaded
    {
        if (!($this->value instanceof MediaStatusUploaded && $this->type === 'uploaded')) {
            throw new Exception(
                "Expected uploaded; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isReady(): bool
    {
        return $this->value instanceof MediaStatusReady && $this->type === 'ready';
    }

    /**
     * @return MediaStatusReady
     */
    public function asReady(): MediaStatusReady
    {
        if (!($this->value instanceof MediaStatusReady && $this->type === 'ready')) {
            throw new Exception(
                "Expected ready; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRejected(): bool
    {
        return $this->value instanceof MediaStatusRejected && $this->type === 'rejected';
    }

    /**
     * @return MediaStatusRejected
     */
    public function asRejected(): MediaStatusRejected
    {
        if (!($this->value instanceof MediaStatusRejected && $this->type === 'rejected')) {
            throw new Exception(
                "Expected rejected; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'pending':
                $value = $this->asPending()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'uploaded':
                $value = $this->asUploaded()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ready':
                $value = $this->asReady()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'rejected':
                $value = $this->asRejected()->jsonSerialize();
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
            case 'pending':
                $args['value'] = MediaStatusPending::jsonDeserialize($data);
                break;
            case 'uploaded':
                $args['value'] = MediaStatusUploaded::jsonDeserialize($data);
                break;
            case 'ready':
                $args['value'] = MediaStatusReady::jsonDeserialize($data);
                break;
            case 'rejected':
                $args['value'] = MediaStatusRejected::jsonDeserialize($data);
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
