<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ConnectOutcome extends JsonSerializableType
{
    /**
     * @var (
     *    'connected'
     *   |'choose'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ConnectOutcomeConnected
     *   |ConnectOutcomeChoose
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'connected'
     *   |'choose'
     *   |'_unknown'
     * ),
     *   value: (
     *    ConnectOutcomeConnected
     *   |ConnectOutcomeChoose
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
     * @param ConnectOutcomeConnected $connected
     * @return ConnectOutcome
     */
    public static function connected(ConnectOutcomeConnected $connected): ConnectOutcome
    {
        return new ConnectOutcome([
            'type' => 'connected',
            'value' => $connected,
        ]);
    }

    /**
     * @param ConnectOutcomeChoose $choose
     * @return ConnectOutcome
     */
    public static function choose(ConnectOutcomeChoose $choose): ConnectOutcome
    {
        return new ConnectOutcome([
            'type' => 'choose',
            'value' => $choose,
        ]);
    }

    /**
     * @return bool
     */
    public function isConnected(): bool
    {
        return $this->value instanceof ConnectOutcomeConnected && $this->type === 'connected';
    }

    /**
     * @return ConnectOutcomeConnected
     */
    public function asConnected(): ConnectOutcomeConnected
    {
        if (!($this->value instanceof ConnectOutcomeConnected && $this->type === 'connected')) {
            throw new Exception(
                "Expected connected; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isChoose(): bool
    {
        return $this->value instanceof ConnectOutcomeChoose && $this->type === 'choose';
    }

    /**
     * @return ConnectOutcomeChoose
     */
    public function asChoose(): ConnectOutcomeChoose
    {
        if (!($this->value instanceof ConnectOutcomeChoose && $this->type === 'choose')) {
            throw new Exception(
                "Expected choose; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'connected':
                $value = $this->asConnected()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'choose':
                $value = $this->asChoose()->jsonSerialize();
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
            case 'connected':
                $args['value'] = ConnectOutcomeConnected::jsonDeserialize($data);
                break;
            case 'choose':
                $args['value'] = ConnectOutcomeChoose::jsonDeserialize($data);
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
