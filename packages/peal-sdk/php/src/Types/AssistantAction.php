<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class AssistantAction extends JsonSerializableType
{
    /**
     * @var (
     *    'rewrite'
     *   |'shorten'
     *   |'translate'
     *   |'hashtags'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    AssistantActionRewrite
     *   |AssistantActionShorten
     *   |AssistantActionTranslate
     *   |AssistantActionHashtags
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'rewrite'
     *   |'shorten'
     *   |'translate'
     *   |'hashtags'
     *   |'_unknown'
     * ),
     *   value: (
     *    AssistantActionRewrite
     *   |AssistantActionShorten
     *   |AssistantActionTranslate
     *   |AssistantActionHashtags
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
     * @param AssistantActionRewrite $rewrite
     * @return AssistantAction
     */
    public static function rewrite(AssistantActionRewrite $rewrite): AssistantAction
    {
        return new AssistantAction([
            'type' => 'rewrite',
            'value' => $rewrite,
        ]);
    }

    /**
     * @param AssistantActionShorten $shorten
     * @return AssistantAction
     */
    public static function shorten(AssistantActionShorten $shorten): AssistantAction
    {
        return new AssistantAction([
            'type' => 'shorten',
            'value' => $shorten,
        ]);
    }

    /**
     * @param AssistantActionTranslate $translate
     * @return AssistantAction
     */
    public static function translate(AssistantActionTranslate $translate): AssistantAction
    {
        return new AssistantAction([
            'type' => 'translate',
            'value' => $translate,
        ]);
    }

    /**
     * @param AssistantActionHashtags $hashtags
     * @return AssistantAction
     */
    public static function hashtags(AssistantActionHashtags $hashtags): AssistantAction
    {
        return new AssistantAction([
            'type' => 'hashtags',
            'value' => $hashtags,
        ]);
    }

    /**
     * @return bool
     */
    public function isRewrite(): bool
    {
        return $this->value instanceof AssistantActionRewrite && $this->type === 'rewrite';
    }

    /**
     * @return AssistantActionRewrite
     */
    public function asRewrite(): AssistantActionRewrite
    {
        if (!($this->value instanceof AssistantActionRewrite && $this->type === 'rewrite')) {
            throw new Exception(
                "Expected rewrite; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isShorten(): bool
    {
        return $this->value instanceof AssistantActionShorten && $this->type === 'shorten';
    }

    /**
     * @return AssistantActionShorten
     */
    public function asShorten(): AssistantActionShorten
    {
        if (!($this->value instanceof AssistantActionShorten && $this->type === 'shorten')) {
            throw new Exception(
                "Expected shorten; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTranslate(): bool
    {
        return $this->value instanceof AssistantActionTranslate && $this->type === 'translate';
    }

    /**
     * @return AssistantActionTranslate
     */
    public function asTranslate(): AssistantActionTranslate
    {
        if (!($this->value instanceof AssistantActionTranslate && $this->type === 'translate')) {
            throw new Exception(
                "Expected translate; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isHashtags(): bool
    {
        return $this->value instanceof AssistantActionHashtags && $this->type === 'hashtags';
    }

    /**
     * @return AssistantActionHashtags
     */
    public function asHashtags(): AssistantActionHashtags
    {
        if (!($this->value instanceof AssistantActionHashtags && $this->type === 'hashtags')) {
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
            case 'rewrite':
                $value = $this->asRewrite()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'shorten':
                $value = $this->asShorten()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'translate':
                $value = $this->asTranslate()->jsonSerialize();
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
            case 'rewrite':
                $args['value'] = AssistantActionRewrite::jsonDeserialize($data);
                break;
            case 'shorten':
                $args['value'] = AssistantActionShorten::jsonDeserialize($data);
                break;
            case 'translate':
                $args['value'] = AssistantActionTranslate::jsonDeserialize($data);
                break;
            case 'hashtags':
                $args['value'] = AssistantActionHashtags::jsonDeserialize($data);
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
