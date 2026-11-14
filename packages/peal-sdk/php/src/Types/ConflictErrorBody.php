<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConflictErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'FollowUpRuleTaken'
     *   |'TooManyFollowUpRules'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    FollowUpRuleTakenEncoded
     *   |TooManyFollowUpRulesEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'FollowUpRuleTaken'
     *   |'TooManyFollowUpRules'
     *   |'_unknown'
     * ),
     *   value: (
     *    FollowUpRuleTakenEncoded
     *   |TooManyFollowUpRulesEncoded
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
     * @param FollowUpRuleTakenEncoded $followUpRuleTaken
     * @return ConflictErrorBody
     */
    public static function followUpRuleTaken(FollowUpRuleTakenEncoded $followUpRuleTaken): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'FollowUpRuleTaken',
            'value' => $followUpRuleTaken,
        ]);
    }

    /**
     * @param TooManyFollowUpRulesEncoded $tooManyFollowUpRules
     * @return ConflictErrorBody
     */
    public static function tooManyFollowUpRules(TooManyFollowUpRulesEncoded $tooManyFollowUpRules): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'TooManyFollowUpRules',
            'value' => $tooManyFollowUpRules,
        ]);
    }

    /**
     * @return bool
     */
    public function isFollowUpRuleTaken(): bool
    {
        return $this->value instanceof FollowUpRuleTakenEncoded && $this->type === 'FollowUpRuleTaken';
    }

    /**
     * @return FollowUpRuleTakenEncoded
     */
    public function asFollowUpRuleTaken(): FollowUpRuleTakenEncoded
    {
        if (!($this->value instanceof FollowUpRuleTakenEncoded && $this->type === 'FollowUpRuleTaken')) {
            throw new Exception(
                "Expected FollowUpRuleTaken; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyFollowUpRules(): bool
    {
        return $this->value instanceof TooManyFollowUpRulesEncoded && $this->type === 'TooManyFollowUpRules';
    }

    /**
     * @return TooManyFollowUpRulesEncoded
     */
    public function asTooManyFollowUpRules(): TooManyFollowUpRulesEncoded
    {
        if (!($this->value instanceof TooManyFollowUpRulesEncoded && $this->type === 'TooManyFollowUpRules')) {
            throw new Exception(
                "Expected TooManyFollowUpRules; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'FollowUpRuleTaken':
                $value = $this->asFollowUpRuleTaken()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TooManyFollowUpRules':
                $value = $this->asTooManyFollowUpRules()->jsonSerialize();
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
            case 'FollowUpRuleTaken':
                $args['value'] = FollowUpRuleTakenEncoded::jsonDeserialize($data);
                break;
            case 'TooManyFollowUpRules':
                $args['value'] = TooManyFollowUpRulesEncoded::jsonDeserialize($data);
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
