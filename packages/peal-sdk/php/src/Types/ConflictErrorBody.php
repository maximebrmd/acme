<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConflictErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'ChannelSetNameTaken'
     *   |'TooManyChannelSets'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ChannelSetNameTakenEncoded
     *   |TooManyChannelSetsEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'ChannelSetNameTaken'
     *   |'TooManyChannelSets'
     *   |'_unknown'
     * ),
     *   value: (
     *    ChannelSetNameTakenEncoded
     *   |TooManyChannelSetsEncoded
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
     * @param ChannelSetNameTakenEncoded $channelSetNameTaken
     * @return ConflictErrorBody
     */
    public static function channelSetNameTaken(ChannelSetNameTakenEncoded $channelSetNameTaken): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'ChannelSetNameTaken',
            'value' => $channelSetNameTaken,
        ]);
    }

    /**
     * @param TooManyChannelSetsEncoded $tooManyChannelSets
     * @return ConflictErrorBody
     */
    public static function tooManyChannelSets(TooManyChannelSetsEncoded $tooManyChannelSets): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'TooManyChannelSets',
            'value' => $tooManyChannelSets,
        ]);
    }

    /**
     * @return bool
     */
    public function isChannelSetNameTaken(): bool
    {
        return $this->value instanceof ChannelSetNameTakenEncoded && $this->type === 'ChannelSetNameTaken';
    }

    /**
     * @return ChannelSetNameTakenEncoded
     */
    public function asChannelSetNameTaken(): ChannelSetNameTakenEncoded
    {
        if (!($this->value instanceof ChannelSetNameTakenEncoded && $this->type === 'ChannelSetNameTaken')) {
            throw new Exception(
                "Expected ChannelSetNameTaken; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyChannelSets(): bool
    {
        return $this->value instanceof TooManyChannelSetsEncoded && $this->type === 'TooManyChannelSets';
    }

    /**
     * @return TooManyChannelSetsEncoded
     */
    public function asTooManyChannelSets(): TooManyChannelSetsEncoded
    {
        if (!($this->value instanceof TooManyChannelSetsEncoded && $this->type === 'TooManyChannelSets')) {
            throw new Exception(
                "Expected TooManyChannelSets; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'ChannelSetNameTaken':
                $value = $this->asChannelSetNameTaken()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TooManyChannelSets':
                $value = $this->asTooManyChannelSets()->jsonSerialize();
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
            case 'ChannelSetNameTaken':
                $args['value'] = ChannelSetNameTakenEncoded::jsonDeserialize($data);
                break;
            case 'TooManyChannelSets':
                $args['value'] = TooManyChannelSetsEncoded::jsonDeserialize($data);
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
