<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class NotFoundErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'ChannelNotFound'
     *   |'LookupNotFound'
     *   |'WorkspaceNotFound'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ChannelNotFoundEncoded
     *   |LookupNotFoundEncoded
     *   |WorkspaceNotFoundEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'ChannelNotFound'
     *   |'LookupNotFound'
     *   |'WorkspaceNotFound'
     *   |'_unknown'
     * ),
     *   value: (
     *    ChannelNotFoundEncoded
     *   |LookupNotFoundEncoded
     *   |WorkspaceNotFoundEncoded
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
     * @param ChannelNotFoundEncoded $channelNotFound
     * @return NotFoundErrorBody
     */
    public static function channelNotFound(ChannelNotFoundEncoded $channelNotFound): NotFoundErrorBody
    {
        return new NotFoundErrorBody([
            'type' => 'ChannelNotFound',
            'value' => $channelNotFound,
        ]);
    }

    /**
     * @param LookupNotFoundEncoded $lookupNotFound
     * @return NotFoundErrorBody
     */
    public static function lookupNotFound(LookupNotFoundEncoded $lookupNotFound): NotFoundErrorBody
    {
        return new NotFoundErrorBody([
            'type' => 'LookupNotFound',
            'value' => $lookupNotFound,
        ]);
    }

    /**
     * @param WorkspaceNotFoundEncoded $workspaceNotFound
     * @return NotFoundErrorBody
     */
    public static function workspaceNotFound(WorkspaceNotFoundEncoded $workspaceNotFound): NotFoundErrorBody
    {
        return new NotFoundErrorBody([
            'type' => 'WorkspaceNotFound',
            'value' => $workspaceNotFound,
        ]);
    }

    /**
     * @return bool
     */
    public function isChannelNotFound(): bool
    {
        return $this->value instanceof ChannelNotFoundEncoded && $this->type === 'ChannelNotFound';
    }

    /**
     * @return ChannelNotFoundEncoded
     */
    public function asChannelNotFound(): ChannelNotFoundEncoded
    {
        if (!($this->value instanceof ChannelNotFoundEncoded && $this->type === 'ChannelNotFound')) {
            throw new Exception(
                "Expected ChannelNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isLookupNotFound(): bool
    {
        return $this->value instanceof LookupNotFoundEncoded && $this->type === 'LookupNotFound';
    }

    /**
     * @return LookupNotFoundEncoded
     */
    public function asLookupNotFound(): LookupNotFoundEncoded
    {
        if (!($this->value instanceof LookupNotFoundEncoded && $this->type === 'LookupNotFound')) {
            throw new Exception(
                "Expected LookupNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isWorkspaceNotFound(): bool
    {
        return $this->value instanceof WorkspaceNotFoundEncoded && $this->type === 'WorkspaceNotFound';
    }

    /**
     * @return WorkspaceNotFoundEncoded
     */
    public function asWorkspaceNotFound(): WorkspaceNotFoundEncoded
    {
        if (!($this->value instanceof WorkspaceNotFoundEncoded && $this->type === 'WorkspaceNotFound')) {
            throw new Exception(
                "Expected WorkspaceNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'ChannelNotFound':
                $value = $this->asChannelNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'LookupNotFound':
                $value = $this->asLookupNotFound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'WorkspaceNotFound':
                $value = $this->asWorkspaceNotFound()->jsonSerialize();
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
            case 'ChannelNotFound':
                $args['value'] = ChannelNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'LookupNotFound':
                $args['value'] = LookupNotFoundEncoded::jsonDeserialize($data);
                break;
            case 'WorkspaceNotFound':
                $args['value'] = WorkspaceNotFoundEncoded::jsonDeserialize($data);
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
