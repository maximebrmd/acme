<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class CredentialBinding extends JsonSerializableType
{
    /**
     * @var (
     *    'unbound'
     *   |'bound'
     *   |'left'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    CredentialBindingUnbound
     *   |CredentialBindingBound
     *   |CredentialBindingLeft
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'unbound'
     *   |'bound'
     *   |'left'
     *   |'_unknown'
     * ),
     *   value: (
     *    CredentialBindingUnbound
     *   |CredentialBindingBound
     *   |CredentialBindingLeft
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
     * @param CredentialBindingUnbound $unbound
     * @return CredentialBinding
     */
    public static function unbound(CredentialBindingUnbound $unbound): CredentialBinding
    {
        return new CredentialBinding([
            'type' => 'unbound',
            'value' => $unbound,
        ]);
    }

    /**
     * @param CredentialBindingBound $bound
     * @return CredentialBinding
     */
    public static function bound(CredentialBindingBound $bound): CredentialBinding
    {
        return new CredentialBinding([
            'type' => 'bound',
            'value' => $bound,
        ]);
    }

    /**
     * @param CredentialBindingLeft $left
     * @return CredentialBinding
     */
    public static function left(CredentialBindingLeft $left): CredentialBinding
    {
        return new CredentialBinding([
            'type' => 'left',
            'value' => $left,
        ]);
    }

    /**
     * @return bool
     */
    public function isUnbound(): bool
    {
        return $this->value instanceof CredentialBindingUnbound && $this->type === 'unbound';
    }

    /**
     * @return CredentialBindingUnbound
     */
    public function asUnbound(): CredentialBindingUnbound
    {
        if (!($this->value instanceof CredentialBindingUnbound && $this->type === 'unbound')) {
            throw new Exception(
                "Expected unbound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isBound(): bool
    {
        return $this->value instanceof CredentialBindingBound && $this->type === 'bound';
    }

    /**
     * @return CredentialBindingBound
     */
    public function asBound(): CredentialBindingBound
    {
        if (!($this->value instanceof CredentialBindingBound && $this->type === 'bound')) {
            throw new Exception(
                "Expected bound; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isLeft(): bool
    {
        return $this->value instanceof CredentialBindingLeft && $this->type === 'left';
    }

    /**
     * @return CredentialBindingLeft
     */
    public function asLeft(): CredentialBindingLeft
    {
        if (!($this->value instanceof CredentialBindingLeft && $this->type === 'left')) {
            throw new Exception(
                "Expected left; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'unbound':
                $value = $this->asUnbound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'bound':
                $value = $this->asBound()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'left':
                $value = $this->asLeft()->jsonSerialize();
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
            case 'unbound':
                $args['value'] = CredentialBindingUnbound::jsonDeserialize($data);
                break;
            case 'bound':
                $args['value'] = CredentialBindingBound::jsonDeserialize($data);
                break;
            case 'left':
                $args['value'] = CredentialBindingLeft::jsonDeserialize($data);
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
