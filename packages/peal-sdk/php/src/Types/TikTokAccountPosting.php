<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class TikTokAccountPosting extends JsonSerializableType
{
    /**
     * @var (
     *    'ready'
     *   |'blocked'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    TikTokAccountPostingReady
     *   |TikTokAccountPostingBlocked
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'ready'
     *   |'blocked'
     *   |'_unknown'
     * ),
     *   value: (
     *    TikTokAccountPostingReady
     *   |TikTokAccountPostingBlocked
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
     * @param TikTokAccountPostingReady $ready
     * @return TikTokAccountPosting
     */
    public static function ready(TikTokAccountPostingReady $ready): TikTokAccountPosting
    {
        return new TikTokAccountPosting([
            'type' => 'ready',
            'value' => $ready,
        ]);
    }

    /**
     * @param TikTokAccountPostingBlocked $blocked
     * @return TikTokAccountPosting
     */
    public static function blocked(TikTokAccountPostingBlocked $blocked): TikTokAccountPosting
    {
        return new TikTokAccountPosting([
            'type' => 'blocked',
            'value' => $blocked,
        ]);
    }

    /**
     * @return bool
     */
    public function isReady(): bool
    {
        return $this->value instanceof TikTokAccountPostingReady && $this->type === 'ready';
    }

    /**
     * @return TikTokAccountPostingReady
     */
    public function asReady(): TikTokAccountPostingReady
    {
        if (!($this->value instanceof TikTokAccountPostingReady && $this->type === 'ready')) {
            throw new Exception(
                "Expected ready; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isBlocked(): bool
    {
        return $this->value instanceof TikTokAccountPostingBlocked && $this->type === 'blocked';
    }

    /**
     * @return TikTokAccountPostingBlocked
     */
    public function asBlocked(): TikTokAccountPostingBlocked
    {
        if (!($this->value instanceof TikTokAccountPostingBlocked && $this->type === 'blocked')) {
            throw new Exception(
                "Expected blocked; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'ready':
                $value = $this->asReady()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'blocked':
                $value = $this->asBlocked()->jsonSerialize();
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
            case 'ready':
                $args['value'] = TikTokAccountPostingReady::jsonDeserialize($data);
                break;
            case 'blocked':
                $args['value'] = TikTokAccountPostingBlocked::jsonDeserialize($data);
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
