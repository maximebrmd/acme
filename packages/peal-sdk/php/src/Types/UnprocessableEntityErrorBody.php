<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class UnprocessableEntityErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'FeedAddressRefused'
     *   |'FeedTemplateInvalid'
     *   |'FeedUnreadable'
     *   |'UnknownChannels'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    FeedAddressRefusedEncoded
     *   |FeedTemplateInvalidEncoded
     *   |FeedUnreadableEncoded
     *   |UnknownChannelsEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'FeedAddressRefused'
     *   |'FeedTemplateInvalid'
     *   |'FeedUnreadable'
     *   |'UnknownChannels'
     *   |'_unknown'
     * ),
     *   value: (
     *    FeedAddressRefusedEncoded
     *   |FeedTemplateInvalidEncoded
     *   |FeedUnreadableEncoded
     *   |UnknownChannelsEncoded
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
     * @param FeedAddressRefusedEncoded $feedAddressRefused
     * @return UnprocessableEntityErrorBody
     */
    public static function feedAddressRefused(FeedAddressRefusedEncoded $feedAddressRefused): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'FeedAddressRefused',
            'value' => $feedAddressRefused,
        ]);
    }

    /**
     * @param FeedTemplateInvalidEncoded $feedTemplateInvalid
     * @return UnprocessableEntityErrorBody
     */
    public static function feedTemplateInvalid(FeedTemplateInvalidEncoded $feedTemplateInvalid): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'FeedTemplateInvalid',
            'value' => $feedTemplateInvalid,
        ]);
    }

    /**
     * @param FeedUnreadableEncoded $feedUnreadable
     * @return UnprocessableEntityErrorBody
     */
    public static function feedUnreadable(FeedUnreadableEncoded $feedUnreadable): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'FeedUnreadable',
            'value' => $feedUnreadable,
        ]);
    }

    /**
     * @param UnknownChannelsEncoded $unknownChannels
     * @return UnprocessableEntityErrorBody
     */
    public static function unknownChannels(UnknownChannelsEncoded $unknownChannels): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'UnknownChannels',
            'value' => $unknownChannels,
        ]);
    }

    /**
     * @return bool
     */
    public function isFeedAddressRefused(): bool
    {
        return $this->value instanceof FeedAddressRefusedEncoded && $this->type === 'FeedAddressRefused';
    }

    /**
     * @return FeedAddressRefusedEncoded
     */
    public function asFeedAddressRefused(): FeedAddressRefusedEncoded
    {
        if (!($this->value instanceof FeedAddressRefusedEncoded && $this->type === 'FeedAddressRefused')) {
            throw new Exception(
                "Expected FeedAddressRefused; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isFeedTemplateInvalid(): bool
    {
        return $this->value instanceof FeedTemplateInvalidEncoded && $this->type === 'FeedTemplateInvalid';
    }

    /**
     * @return FeedTemplateInvalidEncoded
     */
    public function asFeedTemplateInvalid(): FeedTemplateInvalidEncoded
    {
        if (!($this->value instanceof FeedTemplateInvalidEncoded && $this->type === 'FeedTemplateInvalid')) {
            throw new Exception(
                "Expected FeedTemplateInvalid; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isFeedUnreadable(): bool
    {
        return $this->value instanceof FeedUnreadableEncoded && $this->type === 'FeedUnreadable';
    }

    /**
     * @return FeedUnreadableEncoded
     */
    public function asFeedUnreadable(): FeedUnreadableEncoded
    {
        if (!($this->value instanceof FeedUnreadableEncoded && $this->type === 'FeedUnreadable')) {
            throw new Exception(
                "Expected FeedUnreadable; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUnknownChannels(): bool
    {
        return $this->value instanceof UnknownChannelsEncoded && $this->type === 'UnknownChannels';
    }

    /**
     * @return UnknownChannelsEncoded
     */
    public function asUnknownChannels(): UnknownChannelsEncoded
    {
        if (!($this->value instanceof UnknownChannelsEncoded && $this->type === 'UnknownChannels')) {
            throw new Exception(
                "Expected UnknownChannels; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'FeedAddressRefused':
                $value = $this->asFeedAddressRefused()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'FeedTemplateInvalid':
                $value = $this->asFeedTemplateInvalid()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'FeedUnreadable':
                $value = $this->asFeedUnreadable()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'UnknownChannels':
                $value = $this->asUnknownChannels()->jsonSerialize();
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
            case 'FeedAddressRefused':
                $args['value'] = FeedAddressRefusedEncoded::jsonDeserialize($data);
                break;
            case 'FeedTemplateInvalid':
                $args['value'] = FeedTemplateInvalidEncoded::jsonDeserialize($data);
                break;
            case 'FeedUnreadable':
                $args['value'] = FeedUnreadableEncoded::jsonDeserialize($data);
                break;
            case 'UnknownChannels':
                $args['value'] = UnknownChannelsEncoded::jsonDeserialize($data);
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
