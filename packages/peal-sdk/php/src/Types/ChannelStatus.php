<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ChannelStatus extends JsonSerializableType
{
    /**
     * @var (
     *    'active'
     *   |'refreshNeeded'
     *   |'disabled'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ChannelStatusActive
     *   |ChannelStatusRefreshNeeded
     *   |ChannelStatusDisabled
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'active'
     *   |'refreshNeeded'
     *   |'disabled'
     *   |'_unknown'
     * ),
     *   value: (
     *    ChannelStatusActive
     *   |ChannelStatusRefreshNeeded
     *   |ChannelStatusDisabled
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
     * @param ChannelStatusActive $active
     * @return ChannelStatus
     */
    public static function active(ChannelStatusActive $active): ChannelStatus
    {
        return new ChannelStatus([
            'type' => 'active',
            'value' => $active,
        ]);
    }

    /**
     * @param ChannelStatusRefreshNeeded $refreshNeeded
     * @return ChannelStatus
     */
    public static function refreshNeeded(ChannelStatusRefreshNeeded $refreshNeeded): ChannelStatus
    {
        return new ChannelStatus([
            'type' => 'refreshNeeded',
            'value' => $refreshNeeded,
        ]);
    }

    /**
     * @param ChannelStatusDisabled $disabled
     * @return ChannelStatus
     */
    public static function disabled(ChannelStatusDisabled $disabled): ChannelStatus
    {
        return new ChannelStatus([
            'type' => 'disabled',
            'value' => $disabled,
        ]);
    }

    /**
     * @return bool
     */
    public function isActive(): bool
    {
        return $this->value instanceof ChannelStatusActive && $this->type === 'active';
    }

    /**
     * @return ChannelStatusActive
     */
    public function asActive(): ChannelStatusActive
    {
        if (!($this->value instanceof ChannelStatusActive && $this->type === 'active')) {
            throw new Exception(
                "Expected active; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRefreshNeeded(): bool
    {
        return $this->value instanceof ChannelStatusRefreshNeeded && $this->type === 'refreshNeeded';
    }

    /**
     * @return ChannelStatusRefreshNeeded
     */
    public function asRefreshNeeded(): ChannelStatusRefreshNeeded
    {
        if (!($this->value instanceof ChannelStatusRefreshNeeded && $this->type === 'refreshNeeded')) {
            throw new Exception(
                "Expected refreshNeeded; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isDisabled(): bool
    {
        return $this->value instanceof ChannelStatusDisabled && $this->type === 'disabled';
    }

    /**
     * @return ChannelStatusDisabled
     */
    public function asDisabled(): ChannelStatusDisabled
    {
        if (!($this->value instanceof ChannelStatusDisabled && $this->type === 'disabled')) {
            throw new Exception(
                "Expected disabled; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'active':
                $value = $this->asActive()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'refreshNeeded':
                $value = $this->asRefreshNeeded()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'disabled':
                $value = $this->asDisabled()->jsonSerialize();
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
            case 'active':
                $args['value'] = ChannelStatusActive::jsonDeserialize($data);
                break;
            case 'refreshNeeded':
                $args['value'] = ChannelStatusRefreshNeeded::jsonDeserialize($data);
                break;
            case 'disabled':
                $args['value'] = ChannelStatusDisabled::jsonDeserialize($data);
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
