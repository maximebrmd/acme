<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class ServiceUnavailableErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'BillingUnavailable'
     *   |'MediaStoreUnavailable'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    BillingUnavailableEncoded
     *   |MediaStoreUnavailableEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'BillingUnavailable'
     *   |'MediaStoreUnavailable'
     *   |'_unknown'
     * ),
     *   value: (
     *    BillingUnavailableEncoded
     *   |MediaStoreUnavailableEncoded
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
     * @param BillingUnavailableEncoded $billingUnavailable
     * @return ServiceUnavailableErrorBody
     */
    public static function billingUnavailable(BillingUnavailableEncoded $billingUnavailable): ServiceUnavailableErrorBody
    {
        return new ServiceUnavailableErrorBody([
            'type' => 'BillingUnavailable',
            'value' => $billingUnavailable,
        ]);
    }

    /**
     * @param MediaStoreUnavailableEncoded $mediaStoreUnavailable
     * @return ServiceUnavailableErrorBody
     */
    public static function mediaStoreUnavailable(MediaStoreUnavailableEncoded $mediaStoreUnavailable): ServiceUnavailableErrorBody
    {
        return new ServiceUnavailableErrorBody([
            'type' => 'MediaStoreUnavailable',
            'value' => $mediaStoreUnavailable,
        ]);
    }

    /**
     * @return bool
     */
    public function isBillingUnavailable(): bool
    {
        return $this->value instanceof BillingUnavailableEncoded && $this->type === 'BillingUnavailable';
    }

    /**
     * @return BillingUnavailableEncoded
     */
    public function asBillingUnavailable(): BillingUnavailableEncoded
    {
        if (!($this->value instanceof BillingUnavailableEncoded && $this->type === 'BillingUnavailable')) {
            throw new Exception(
                "Expected BillingUnavailable; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isMediaStoreUnavailable(): bool
    {
        return $this->value instanceof MediaStoreUnavailableEncoded && $this->type === 'MediaStoreUnavailable';
    }

    /**
     * @return MediaStoreUnavailableEncoded
     */
    public function asMediaStoreUnavailable(): MediaStoreUnavailableEncoded
    {
        if (!($this->value instanceof MediaStoreUnavailableEncoded && $this->type === 'MediaStoreUnavailable')) {
            throw new Exception(
                "Expected MediaStoreUnavailable; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'BillingUnavailable':
                $value = $this->asBillingUnavailable()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'MediaStoreUnavailable':
                $value = $this->asMediaStoreUnavailable()->jsonSerialize();
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
            case 'BillingUnavailable':
                $args['value'] = BillingUnavailableEncoded::jsonDeserialize($data);
                break;
            case 'MediaStoreUnavailable':
                $args['value'] = MediaStoreUnavailableEncoded::jsonDeserialize($data);
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
