<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConflictErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'PostNotRecyclable'
     *   |'RecyclingRuleEnded'
     *   |'TooManyRecyclingRules'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    PostNotRecyclableEncoded
     *   |RecyclingRuleEndedEncoded
     *   |TooManyRecyclingRulesEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'PostNotRecyclable'
     *   |'RecyclingRuleEnded'
     *   |'TooManyRecyclingRules'
     *   |'_unknown'
     * ),
     *   value: (
     *    PostNotRecyclableEncoded
     *   |RecyclingRuleEndedEncoded
     *   |TooManyRecyclingRulesEncoded
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
     * @param PostNotRecyclableEncoded $postNotRecyclable
     * @return ConflictErrorBody
     */
    public static function postNotRecyclable(PostNotRecyclableEncoded $postNotRecyclable): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'PostNotRecyclable',
            'value' => $postNotRecyclable,
        ]);
    }

    /**
     * @param RecyclingRuleEndedEncoded $recyclingRuleEnded
     * @return ConflictErrorBody
     */
    public static function recyclingRuleEnded(RecyclingRuleEndedEncoded $recyclingRuleEnded): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'RecyclingRuleEnded',
            'value' => $recyclingRuleEnded,
        ]);
    }

    /**
     * @param TooManyRecyclingRulesEncoded $tooManyRecyclingRules
     * @return ConflictErrorBody
     */
    public static function tooManyRecyclingRules(TooManyRecyclingRulesEncoded $tooManyRecyclingRules): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'TooManyRecyclingRules',
            'value' => $tooManyRecyclingRules,
        ]);
    }

    /**
     * @return bool
     */
    public function isPostNotRecyclable(): bool
    {
        return $this->value instanceof PostNotRecyclableEncoded && $this->type === 'PostNotRecyclable';
    }

    /**
     * @return PostNotRecyclableEncoded
     */
    public function asPostNotRecyclable(): PostNotRecyclableEncoded
    {
        if (!($this->value instanceof PostNotRecyclableEncoded && $this->type === 'PostNotRecyclable')) {
            throw new Exception(
                "Expected PostNotRecyclable; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRecyclingRuleEnded(): bool
    {
        return $this->value instanceof RecyclingRuleEndedEncoded && $this->type === 'RecyclingRuleEnded';
    }

    /**
     * @return RecyclingRuleEndedEncoded
     */
    public function asRecyclingRuleEnded(): RecyclingRuleEndedEncoded
    {
        if (!($this->value instanceof RecyclingRuleEndedEncoded && $this->type === 'RecyclingRuleEnded')) {
            throw new Exception(
                "Expected RecyclingRuleEnded; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyRecyclingRules(): bool
    {
        return $this->value instanceof TooManyRecyclingRulesEncoded && $this->type === 'TooManyRecyclingRules';
    }

    /**
     * @return TooManyRecyclingRulesEncoded
     */
    public function asTooManyRecyclingRules(): TooManyRecyclingRulesEncoded
    {
        if (!($this->value instanceof TooManyRecyclingRulesEncoded && $this->type === 'TooManyRecyclingRules')) {
            throw new Exception(
                "Expected TooManyRecyclingRules; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'PostNotRecyclable':
                $value = $this->asPostNotRecyclable()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'RecyclingRuleEnded':
                $value = $this->asRecyclingRuleEnded()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TooManyRecyclingRules':
                $value = $this->asTooManyRecyclingRules()->jsonSerialize();
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
            case 'PostNotRecyclable':
                $args['value'] = PostNotRecyclableEncoded::jsonDeserialize($data);
                break;
            case 'RecyclingRuleEnded':
                $args['value'] = RecyclingRuleEndedEncoded::jsonDeserialize($data);
                break;
            case 'TooManyRecyclingRules':
                $args['value'] = TooManyRecyclingRulesEncoded::jsonDeserialize($data);
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
