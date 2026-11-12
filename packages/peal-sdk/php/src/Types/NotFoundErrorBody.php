<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class NotFoundErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'ShortLinkNotFound'
     *   |'WorkspaceNotFound'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ShortLinkNotFoundEncoded
     *   |WorkspaceNotFoundEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'ShortLinkNotFound'
     *   |'WorkspaceNotFound'
     *   |'_unknown'
     * ),
     *   value: (
     *    ShortLinkNotFoundEncoded
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
     * @param ShortLinkNotFoundEncoded $shortLinkNotFound
     * @return NotFoundErrorBody
     */
    public static function shortLinkNotFound(ShortLinkNotFoundEncoded $shortLinkNotFound): NotFoundErrorBody
    {
        return new NotFoundErrorBody([
            'type' => 'ShortLinkNotFound',
            'value' => $shortLinkNotFound,
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
    public function isShortLinkNotFound(): bool
    {
        return $this->value instanceof ShortLinkNotFoundEncoded && $this->type === 'ShortLinkNotFound';
    }

    /**
     * @return ShortLinkNotFoundEncoded
     */
    public function asShortLinkNotFound(): ShortLinkNotFoundEncoded
    {
        if (!($this->value instanceof ShortLinkNotFoundEncoded && $this->type === 'ShortLinkNotFound')) {
            throw new Exception(
                "Expected ShortLinkNotFound; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'ShortLinkNotFound':
                $value = $this->asShortLinkNotFound()->jsonSerialize();
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
            case 'ShortLinkNotFound':
                $args['value'] = ShortLinkNotFoundEncoded::jsonDeserialize($data);
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
