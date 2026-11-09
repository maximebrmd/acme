<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PlanOffer extends JsonSerializableType
{
    /**
     * @var PlanAllowances $allowances
     */
    #[JsonProperty('allowances')]
    public PlanAllowances $allowances;

    /**
     * @var value-of<Plan> $plan
     */
    #[JsonProperty('plan')]
    public string $plan;

    /**
     * @param array{
     *   allowances: PlanAllowances,
     *   plan: value-of<Plan>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowances = $values['allowances'];
        $this->plan = $values['plan'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
