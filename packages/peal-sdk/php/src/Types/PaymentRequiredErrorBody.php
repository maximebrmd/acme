<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class PaymentRequiredErrorBody extends JsonSerializableType
{
    /**
     * @var (
     *    'UsageAllowanceReached'
     *   |'PlanLimitReached'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    UsageAllowanceReachedEncoded
     *   |PlanLimitReachedEncoded
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'UsageAllowanceReached'
     *   |'PlanLimitReached'
     *   |'_unknown'
     * ),
     *   value: (
     *    UsageAllowanceReachedEncoded
     *   |PlanLimitReachedEncoded
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
     * @param UsageAllowanceReachedEncoded $usageAllowanceReached
     * @return PaymentRequiredErrorBody
     */
    public static function usageAllowanceReached(UsageAllowanceReachedEncoded $usageAllowanceReached): PaymentRequiredErrorBody
    {
        return new PaymentRequiredErrorBody([
            'type' => 'UsageAllowanceReached',
            'value' => $usageAllowanceReached,
        ]);
    }

    /**
     * @param PlanLimitReachedEncoded $planLimitReached
     * @return PaymentRequiredErrorBody
     */
    public static function planLimitReached(PlanLimitReachedEncoded $planLimitReached): PaymentRequiredErrorBody
    {
        return new PaymentRequiredErrorBody([
            'type' => 'PlanLimitReached',
            'value' => $planLimitReached,
        ]);
    }

    /**
     * @return bool
     */
    public function isUsageAllowanceReached(): bool
    {
        return $this->value instanceof UsageAllowanceReachedEncoded && $this->type === 'UsageAllowanceReached';
    }

    /**
     * @return UsageAllowanceReachedEncoded
     */
    public function asUsageAllowanceReached(): UsageAllowanceReachedEncoded
    {
        if (!($this->value instanceof UsageAllowanceReachedEncoded && $this->type === 'UsageAllowanceReached')) {
            throw new Exception(
                "Expected UsageAllowanceReached; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPlanLimitReached(): bool
    {
        return $this->value instanceof PlanLimitReachedEncoded && $this->type === 'PlanLimitReached';
    }

    /**
     * @return PlanLimitReachedEncoded
     */
    public function asPlanLimitReached(): PlanLimitReachedEncoded
    {
        if (!($this->value instanceof PlanLimitReachedEncoded && $this->type === 'PlanLimitReached')) {
            throw new Exception(
                "Expected PlanLimitReached; got " . $this->type . " with value of type " . get_debug_type($this->value),
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
            case 'UsageAllowanceReached':
                $value = $this->asUsageAllowanceReached()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PlanLimitReached':
                $value = $this->asPlanLimitReached()->jsonSerialize();
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
            case 'UsageAllowanceReached':
                $args['value'] = UsageAllowanceReachedEncoded::jsonDeserialize($data);
                break;
            case 'PlanLimitReached':
                $args['value'] = PlanLimitReachedEncoded::jsonDeserialize($data);
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
