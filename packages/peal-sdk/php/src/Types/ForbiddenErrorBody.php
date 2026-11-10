<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ForbiddenErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'Forbidden'
     *   |'PartnerAccountsClosed'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    ForbiddenEncoded
     *   |PartnerAccountsClosedEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'Forbidden'
     *   |'PartnerAccountsClosed'
     *   |'_unknown'
     * ),
     *   value: (
     *    ForbiddenEncoded
     *   |PartnerAccountsClosedEncoded
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
     * @param ForbiddenEncoded $forbidden
     * @return ForbiddenErrorBody
     */
    public static function forbidden(ForbiddenEncoded $forbidden): ForbiddenErrorBody
    {
        return new ForbiddenErrorBody([
            'type' => 'Forbidden',
            'value' => $forbidden,
        ]);
    }

    /**
     * @param PartnerAccountsClosedEncoded $partnerAccountsClosed
     * @return ForbiddenErrorBody
     */
    public static function partnerAccountsClosed(PartnerAccountsClosedEncoded $partnerAccountsClosed): ForbiddenErrorBody
    {
        return new ForbiddenErrorBody([
            'type' => 'PartnerAccountsClosed',
            'value' => $partnerAccountsClosed,
        ]);
    }

    /**
     * @return bool
     */
    public function isForbidden(): bool
    {
        return $this->value instanceof ForbiddenEncoded && $this->type === 'Forbidden';
    }

    /**
     * @return ForbiddenEncoded
     */
    public function asForbidden(): ForbiddenEncoded
    {
        if (!($this->value instanceof ForbiddenEncoded && $this->type === 'Forbidden')) {
            throw new Exception(
                "Expected Forbidden; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPartnerAccountsClosed(): bool
    {
        return $this->value instanceof PartnerAccountsClosedEncoded && $this->type === 'PartnerAccountsClosed';
    }

    /**
     * @return PartnerAccountsClosedEncoded
     */
    public function asPartnerAccountsClosed(): PartnerAccountsClosedEncoded
    {
        if (!($this->value instanceof PartnerAccountsClosedEncoded && $this->type === 'PartnerAccountsClosed')) {
            throw new Exception(
                "Expected PartnerAccountsClosed; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'Forbidden':
                $value = $this->asForbidden()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PartnerAccountsClosed':
                $value = $this->asPartnerAccountsClosed()->jsonSerialize();
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
            case 'Forbidden':
                $args['value'] = ForbiddenEncoded::jsonDeserialize($data);
                break;
            case 'PartnerAccountsClosed':
                $args['value'] = PartnerAccountsClosedEncoded::jsonDeserialize($data);
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
