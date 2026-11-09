<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventTrialEnding extends JsonSerializableType
{
    /**
     * @var string $endsAt
     */
    #[JsonProperty('endsAt')]
    public string $endsAt;

    /**
     * @var value-of<PaidPlan> $plan
     */
    #[JsonProperty('plan')]
    public string $plan;

    /**
     * @param array{
     *   endsAt: string,
     *   plan: value-of<PaidPlan>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->endsAt = $values['endsAt'];
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
