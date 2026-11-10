<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ActivityActor extends JsonSerializableType
{
    /**
     * @var (
     *    'user'
     *   |'apiKey'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ActivityActorUser
     *   |ActivityActorApiKey
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'user'
     *   |'apiKey'
     *   |'_unknown'
     * ),
     *   value: (
     *    ActivityActorUser
     *   |ActivityActorApiKey
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
     * @param ActivityActorUser $user
     * @return ActivityActor
     */
    public static function user(ActivityActorUser $user): ActivityActor
    {
        return new ActivityActor([
            'type' => 'user',
            'value' => $user,
        ]);
    }

    /**
     * @param ActivityActorApiKey $apiKey
     * @return ActivityActor
     */
    public static function apiKey(ActivityActorApiKey $apiKey): ActivityActor
    {
        return new ActivityActor([
            'type' => 'apiKey',
            'value' => $apiKey,
        ]);
    }

    /**
     * @return bool
     */
    public function isUser(): bool
    {
        return $this->value instanceof ActivityActorUser && $this->type === 'user';
    }

    /**
     * @return ActivityActorUser
     */
    public function asUser(): ActivityActorUser
    {
        if (!($this->value instanceof ActivityActorUser && $this->type === 'user')) {
            throw new Exception(
                "Expected user; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isApiKey(): bool
    {
        return $this->value instanceof ActivityActorApiKey && $this->type === 'apiKey';
    }

    /**
     * @return ActivityActorApiKey
     */
    public function asApiKey(): ActivityActorApiKey
    {
        if (!($this->value instanceof ActivityActorApiKey && $this->type === 'apiKey')) {
            throw new Exception(
                "Expected apiKey; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'user':
                $value = $this->asUser()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'apiKey':
                $value = $this->asApiKey()->jsonSerialize();
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
            case 'user':
                $args['value'] = ActivityActorUser::jsonDeserialize($data);
                break;
            case 'apiKey':
                $args['value'] = ActivityActorApiKey::jsonDeserialize($data);
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
