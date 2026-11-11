<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConflictErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'QueueNameTaken'
     *   |'TooManyQueues'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    QueueNameTakenEncoded
     *   |TooManyQueuesEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'QueueNameTaken'
     *   |'TooManyQueues'
     *   |'_unknown'
     * ),
     *   value: (
     *    QueueNameTakenEncoded
     *   |TooManyQueuesEncoded
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
     * @param QueueNameTakenEncoded $queueNameTaken
     * @return ConflictErrorBody
     */
    public static function queueNameTaken(QueueNameTakenEncoded $queueNameTaken): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'QueueNameTaken',
            'value' => $queueNameTaken,
        ]);
    }

    /**
     * @param TooManyQueuesEncoded $tooManyQueues
     * @return ConflictErrorBody
     */
    public static function tooManyQueues(TooManyQueuesEncoded $tooManyQueues): ConflictErrorBody
    {
        return new ConflictErrorBody([
            'type' => 'TooManyQueues',
            'value' => $tooManyQueues,
        ]);
    }

    /**
     * @return bool
     */
    public function isQueueNameTaken(): bool
    {
        return $this->value instanceof QueueNameTakenEncoded && $this->type === 'QueueNameTaken';
    }

    /**
     * @return QueueNameTakenEncoded
     */
    public function asQueueNameTaken(): QueueNameTakenEncoded
    {
        if (!($this->value instanceof QueueNameTakenEncoded && $this->type === 'QueueNameTaken')) {
            throw new Exception(
                "Expected QueueNameTaken; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTooManyQueues(): bool
    {
        return $this->value instanceof TooManyQueuesEncoded && $this->type === 'TooManyQueues';
    }

    /**
     * @return TooManyQueuesEncoded
     */
    public function asTooManyQueues(): TooManyQueuesEncoded
    {
        if (!($this->value instanceof TooManyQueuesEncoded && $this->type === 'TooManyQueues')) {
            throw new Exception(
                "Expected TooManyQueues; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'QueueNameTaken':
                $value = $this->asQueueNameTaken()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TooManyQueues':
                $value = $this->asTooManyQueues()->jsonSerialize();
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
            case 'QueueNameTaken':
                $args['value'] = QueueNameTakenEncoded::jsonDeserialize($data);
                break;
            case 'TooManyQueues':
                $args['value'] = TooManyQueuesEncoded::jsonDeserialize($data);
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
