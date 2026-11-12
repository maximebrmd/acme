<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class Credential extends JsonSerializableType
{
    /**
     * @var (
     *    'user'
     *   |'apiKey'
     *   |'partnerKey'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    CredentialUser
     *   |CredentialApiKey
     *   |CredentialPartnerKey
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'user'
     *   |'apiKey'
     *   |'partnerKey'
     *   |'_unknown'
     * ),
     *   value: (
     *    CredentialUser
     *   |CredentialApiKey
     *   |CredentialPartnerKey
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
     * @param CredentialUser $user
     * @return Credential
     */
    public static function user(CredentialUser $user): Credential
    {
        return new Credential([
            'type' => 'user',
            'value' => $user,
        ]);
    }

    /**
     * @param CredentialApiKey $apiKey
     * @return Credential
     */
    public static function apiKey(CredentialApiKey $apiKey): Credential
    {
        return new Credential([
            'type' => 'apiKey',
            'value' => $apiKey,
        ]);
    }

    /**
     * @param CredentialPartnerKey $partnerKey
     * @return Credential
     */
    public static function partnerKey(CredentialPartnerKey $partnerKey): Credential
    {
        return new Credential([
            'type' => 'partnerKey',
            'value' => $partnerKey,
        ]);
    }

    /**
     * @return bool
     */
    public function isUser(): bool
    {
        return $this->value instanceof CredentialUser && $this->type === 'user';
    }

    /**
     * @return CredentialUser
     */
    public function asUser(): CredentialUser
    {
        if (!($this->value instanceof CredentialUser && $this->type === 'user')) {
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
        return $this->value instanceof CredentialApiKey && $this->type === 'apiKey';
    }

    /**
     * @return CredentialApiKey
     */
    public function asApiKey(): CredentialApiKey
    {
        if (!($this->value instanceof CredentialApiKey && $this->type === 'apiKey')) {
            throw new Exception(
                "Expected apiKey; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPartnerKey(): bool
    {
        return $this->value instanceof CredentialPartnerKey && $this->type === 'partnerKey';
    }

    /**
     * @return CredentialPartnerKey
     */
    public function asPartnerKey(): CredentialPartnerKey
    {
        if (!($this->value instanceof CredentialPartnerKey && $this->type === 'partnerKey')) {
            throw new Exception(
                "Expected partnerKey; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'partnerKey':
                $value = $this->asPartnerKey()->jsonSerialize();
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
                $args['value'] = CredentialUser::jsonDeserialize($data);
                break;
            case 'apiKey':
                $args['value'] = CredentialApiKey::jsonDeserialize($data);
                break;
            case 'partnerKey':
                $args['value'] = CredentialPartnerKey::jsonDeserialize($data);
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
