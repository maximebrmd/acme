<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class AccountStanding extends JsonSerializableType
{
    /**
     * @var (
     *    'unrestricted'
     *   |'read'
     *   |'unread'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    AccountStandingUnrestricted
     *   |AccountStandingRead
     *   |AccountStandingUnread
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'unrestricted'
     *   |'read'
     *   |'unread'
     *   |'_unknown'
     * ),
     *   value: (
     *    AccountStandingUnrestricted
     *   |AccountStandingRead
     *   |AccountStandingUnread
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
     * @param AccountStandingUnrestricted $unrestricted
     * @return AccountStanding
     */
    public static function unrestricted(AccountStandingUnrestricted $unrestricted): AccountStanding
    {
        return new AccountStanding([
            'type' => 'unrestricted',
            'value' => $unrestricted,
        ]);
    }

    /**
     * @param AccountStandingRead $read
     * @return AccountStanding
     */
    public static function read(AccountStandingRead $read): AccountStanding
    {
        return new AccountStanding([
            'type' => 'read',
            'value' => $read,
        ]);
    }

    /**
     * @param AccountStandingUnread $unread
     * @return AccountStanding
     */
    public static function unread(AccountStandingUnread $unread): AccountStanding
    {
        return new AccountStanding([
            'type' => 'unread',
            'value' => $unread,
        ]);
    }

    /**
     * @return bool
     */
    public function isUnrestricted(): bool
    {
        return $this->value instanceof AccountStandingUnrestricted && $this->type === 'unrestricted';
    }

    /**
     * @return AccountStandingUnrestricted
     */
    public function asUnrestricted(): AccountStandingUnrestricted
    {
        if (!($this->value instanceof AccountStandingUnrestricted && $this->type === 'unrestricted')) {
            throw new Exception(
                "Expected unrestricted; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRead(): bool
    {
        return $this->value instanceof AccountStandingRead && $this->type === 'read';
    }

    /**
     * @return AccountStandingRead
     */
    public function asRead(): AccountStandingRead
    {
        if (!($this->value instanceof AccountStandingRead && $this->type === 'read')) {
            throw new Exception(
                "Expected read; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isUnread(): bool
    {
        return $this->value instanceof AccountStandingUnread && $this->type === 'unread';
    }

    /**
     * @return AccountStandingUnread
     */
    public function asUnread(): AccountStandingUnread
    {
        if (!($this->value instanceof AccountStandingUnread && $this->type === 'unread')) {
            throw new Exception(
                "Expected unread; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'unrestricted':
                $value = $this->asUnrestricted()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'read':
                $value = $this->asRead()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'unread':
                $value = $this->asUnread()->jsonSerialize();
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
            case 'unrestricted':
                $args['value'] = AccountStandingUnrestricted::jsonDeserialize($data);
                break;
            case 'read':
                $args['value'] = AccountStandingRead::jsonDeserialize($data);
                break;
            case 'unread':
                $args['value'] = AccountStandingUnread::jsonDeserialize($data);
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
