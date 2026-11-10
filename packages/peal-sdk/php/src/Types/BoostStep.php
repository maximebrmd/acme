<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BoostStep extends JsonSerializableType
{
    /**
     * @var ?string $finishedAt
     */
    #[JsonProperty('finishedAt')]
    public ?string $finishedAt;

    /**
     * @var ?string $networkCode
     */
    #[JsonProperty('networkCode')]
    public ?string $networkCode;

    /**
     * @var ?value-of<BoostStepOutcome> $outcome
     */
    #[JsonProperty('outcome')]
    public ?string $outcome;

    /**
     * @var string $startedAt
     */
    #[JsonProperty('startedAt')]
    public string $startedAt;

    /**
     * @var value-of<BoostStepStep> $step
     */
    #[JsonProperty('step')]
    public string $step;

    /**
     * @param array{
     *   startedAt: string,
     *   step: value-of<BoostStepStep>,
     *   finishedAt?: ?string,
     *   networkCode?: ?string,
     *   outcome?: ?value-of<BoostStepOutcome>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->finishedAt = $values['finishedAt'] ?? null;
        $this->networkCode = $values['networkCode'] ?? null;
        $this->outcome = $values['outcome'] ?? null;
        $this->startedAt = $values['startedAt'];
        $this->step = $values['step'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
