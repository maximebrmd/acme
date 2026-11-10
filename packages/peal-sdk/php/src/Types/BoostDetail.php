<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class BoostDetail extends JsonSerializableType
{
    /**
     * @var Boost $boost
     */
    #[JsonProperty('boost')]
    public Boost $boost;

    /**
     * @var array<BoostStep> $steps
     */
    #[JsonProperty('steps'), ArrayType([BoostStep::class])]
    public array $steps;

    /**
     * @param array{
     *   boost: Boost,
     *   steps: array<BoostStep>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->boost = $values['boost'];
        $this->steps = $values['steps'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
