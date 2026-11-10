<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class SignatureScope extends JsonSerializableType
{
    /**
     * @var (
     *    'workspace'
     *   |'platform'
     *   |'channel'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    SignatureScopeWorkspace
     *   |SignatureScopePlatform
     *   |SignatureScopeChannel
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'workspace'
     *   |'platform'
     *   |'channel'
     *   |'_unknown'
     * ),
     *   value: (
     *    SignatureScopeWorkspace
     *   |SignatureScopePlatform
     *   |SignatureScopeChannel
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
     * @param SignatureScopeWorkspace $workspace
     * @return SignatureScope
     */
    public static function workspace(SignatureScopeWorkspace $workspace): SignatureScope
    {
        return new SignatureScope([
            'type' => 'workspace',
            'value' => $workspace,
        ]);
    }

    /**
     * @param SignatureScopePlatform $platform
     * @return SignatureScope
     */
    public static function platform(SignatureScopePlatform $platform): SignatureScope
    {
        return new SignatureScope([
            'type' => 'platform',
            'value' => $platform,
        ]);
    }

    /**
     * @param SignatureScopeChannel $channel
     * @return SignatureScope
     */
    public static function channel(SignatureScopeChannel $channel): SignatureScope
    {
        return new SignatureScope([
            'type' => 'channel',
            'value' => $channel,
        ]);
    }

    /**
     * @return bool
     */
    public function isWorkspace(): bool
    {
        return $this->value instanceof SignatureScopeWorkspace && $this->type === 'workspace';
    }

    /**
     * @return SignatureScopeWorkspace
     */
    public function asWorkspace(): SignatureScopeWorkspace
    {
        if (!($this->value instanceof SignatureScopeWorkspace && $this->type === 'workspace')) {
            throw new Exception(
                "Expected workspace; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPlatform(): bool
    {
        return $this->value instanceof SignatureScopePlatform && $this->type === 'platform';
    }

    /**
     * @return SignatureScopePlatform
     */
    public function asPlatform(): SignatureScopePlatform
    {
        if (!($this->value instanceof SignatureScopePlatform && $this->type === 'platform')) {
            throw new Exception(
                "Expected platform; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isChannel(): bool
    {
        return $this->value instanceof SignatureScopeChannel && $this->type === 'channel';
    }

    /**
     * @return SignatureScopeChannel
     */
    public function asChannel(): SignatureScopeChannel
    {
        if (!($this->value instanceof SignatureScopeChannel && $this->type === 'channel')) {
            throw new Exception(
                "Expected channel; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'workspace':
                $value = $this->asWorkspace()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'platform':
                $value = $this->asPlatform()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'channel':
                $value = $this->asChannel()->jsonSerialize();
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
            case 'workspace':
                $args['value'] = SignatureScopeWorkspace::jsonDeserialize($data);
                break;
            case 'platform':
                $args['value'] = SignatureScopePlatform::jsonDeserialize($data);
                break;
            case 'channel':
                $args['value'] = SignatureScopeChannel::jsonDeserialize($data);
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
