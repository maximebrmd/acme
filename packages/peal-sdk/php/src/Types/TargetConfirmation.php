<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class TargetConfirmation extends JsonSerializableType
{
    /**
     * @var (
     *    'published'
     *   |'notPublished'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    TargetConfirmationPublished
     *   |TargetConfirmationNotPublished
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'published'
     *   |'notPublished'
     *   |'_unknown'
     * ),
     *   value: (
     *    TargetConfirmationPublished
     *   |TargetConfirmationNotPublished
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
     * @param TargetConfirmationPublished $published
     * @return TargetConfirmation
     */
    public static function published(TargetConfirmationPublished $published): TargetConfirmation
    {
        return new TargetConfirmation([
            'type' => 'published',
            'value' => $published,
        ]);
    }

    /**
     * @param TargetConfirmationNotPublished $notPublished
     * @return TargetConfirmation
     */
    public static function notPublished(TargetConfirmationNotPublished $notPublished): TargetConfirmation
    {
        return new TargetConfirmation([
            'type' => 'notPublished',
            'value' => $notPublished,
        ]);
    }

    /**
     * @return bool
     */
    public function isPublished(): bool
    {
        return $this->value instanceof TargetConfirmationPublished && $this->type === 'published';
    }

    /**
     * @return TargetConfirmationPublished
     */
    public function asPublished(): TargetConfirmationPublished
    {
        if (!($this->value instanceof TargetConfirmationPublished && $this->type === 'published')) {
            throw new Exception(
                "Expected published; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isNotPublished(): bool
    {
        return $this->value instanceof TargetConfirmationNotPublished && $this->type === 'notPublished';
    }

    /**
     * @return TargetConfirmationNotPublished
     */
    public function asNotPublished(): TargetConfirmationNotPublished
    {
        if (!($this->value instanceof TargetConfirmationNotPublished && $this->type === 'notPublished')) {
            throw new Exception(
                "Expected notPublished; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'published':
                $value = $this->asPublished()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'notPublished':
                $value = $this->asNotPublished()->jsonSerialize();
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
            case 'published':
                $args['value'] = TargetConfirmationPublished::jsonDeserialize($data);
                break;
            case 'notPublished':
                $args['value'] = TargetConfirmationNotPublished::jsonDeserialize($data);
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
