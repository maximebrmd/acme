<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class UnprocessableEntityErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'ConnectFailed'
     *   |'ReturnUrlNotAllowed'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ConnectFailedEncoded
     *   |ReturnUrlNotAllowedEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'ConnectFailed'
     *   |'ReturnUrlNotAllowed'
     *   |'_unknown'
     * ),
     *   value: (
     *    ConnectFailedEncoded
     *   |ReturnUrlNotAllowedEncoded
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
     * @param ConnectFailedEncoded $connectFailed
     * @return UnprocessableEntityErrorBody
     */
    public static function connectFailed(ConnectFailedEncoded $connectFailed): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'ConnectFailed',
            'value' => $connectFailed,
        ]);
    }

    /**
     * @param ReturnUrlNotAllowedEncoded $returnUrlNotAllowed
     * @return UnprocessableEntityErrorBody
     */
    public static function returnUrlNotAllowed(ReturnUrlNotAllowedEncoded $returnUrlNotAllowed): UnprocessableEntityErrorBody
    {
        return new UnprocessableEntityErrorBody([
            'type' => 'ReturnUrlNotAllowed',
            'value' => $returnUrlNotAllowed,
        ]);
    }

    /**
     * @return bool
     */
    public function isConnectFailed(): bool
    {
        return $this->value instanceof ConnectFailedEncoded && $this->type === 'ConnectFailed';
    }

    /**
     * @return ConnectFailedEncoded
     */
    public function asConnectFailed(): ConnectFailedEncoded
    {
        if (!($this->value instanceof ConnectFailedEncoded && $this->type === 'ConnectFailed')) {
            throw new Exception(
                "Expected ConnectFailed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isReturnUrlNotAllowed(): bool
    {
        return $this->value instanceof ReturnUrlNotAllowedEncoded && $this->type === 'ReturnUrlNotAllowed';
    }

    /**
     * @return ReturnUrlNotAllowedEncoded
     */
    public function asReturnUrlNotAllowed(): ReturnUrlNotAllowedEncoded
    {
        if (!($this->value instanceof ReturnUrlNotAllowedEncoded && $this->type === 'ReturnUrlNotAllowed')) {
            throw new Exception(
                "Expected ReturnUrlNotAllowed; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'ConnectFailed':
                $value = $this->asConnectFailed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ReturnUrlNotAllowed':
                $value = $this->asReturnUrlNotAllowed()->jsonSerialize();
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
            case 'ConnectFailed':
                $args['value'] = ConnectFailedEncoded::jsonDeserialize($data);
                break;
            case 'ReturnUrlNotAllowed':
                $args['value'] = ReturnUrlNotAllowedEncoded::jsonDeserialize($data);
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
