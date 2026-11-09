<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class Suggestion extends JsonSerializableType
{
    /**
     * @var (
     *    'text'
     *   |'hashtags'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    SuggestionText
     *   |SuggestionHashtags
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'text'
     *   |'hashtags'
     *   |'_unknown'
     * ),
     *   value: (
     *    SuggestionText
     *   |SuggestionHashtags
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
     * @param SuggestionText $text
     * @return Suggestion
     */
    public static function text(SuggestionText $text): Suggestion
    {
        return new Suggestion([
            'type' => 'text',
            'value' => $text,
        ]);
    }

    /**
     * @param SuggestionHashtags $hashtags
     * @return Suggestion
     */
    public static function hashtags(SuggestionHashtags $hashtags): Suggestion
    {
        return new Suggestion([
            'type' => 'hashtags',
            'value' => $hashtags,
        ]);
    }

    /**
     * @return bool
     */
    public function isText(): bool
    {
        return $this->value instanceof SuggestionText && $this->type === 'text';
    }

    /**
     * @return SuggestionText
     */
    public function asText(): SuggestionText
    {
        if (!($this->value instanceof SuggestionText && $this->type === 'text')) {
            throw new Exception(
                "Expected text; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isHashtags(): bool
    {
        return $this->value instanceof SuggestionHashtags && $this->type === 'hashtags';
    }

    /**
     * @return SuggestionHashtags
     */
    public function asHashtags(): SuggestionHashtags
    {
        if (!($this->value instanceof SuggestionHashtags && $this->type === 'hashtags')) {
            throw new Exception(
                "Expected hashtags; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'text':
                $value = $this->asText()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'hashtags':
                $value = $this->asHashtags()->jsonSerialize();
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
            case 'text':
                $args['value'] = SuggestionText::jsonDeserialize($data);
                break;
            case 'hashtags':
                $args['value'] = SuggestionHashtags::jsonDeserialize($data);
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
