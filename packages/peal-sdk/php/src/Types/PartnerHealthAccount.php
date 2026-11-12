<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PartnerHealthAccount extends JsonSerializableType
{
    /**
     * @var ?bool $overPlan
     */
    #[JsonProperty('overPlan')]
    public ?bool $overPlan;

    /**
     * @param array{
     *   overPlan?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->overPlan = $values['overPlan'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
