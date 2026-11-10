<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PlanLimitReachedEncoded extends JsonSerializableType
{
    /**
     * @var value-of<PlanLimitReachedEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var int $allowed
     */
    #[JsonProperty('allowed')]
    public int $allowed;

    /**
     * @var string $billingUrl
     */
    #[JsonProperty('billingUrl')]
    public string $billingUrl;

    /**
     * @var value-of<PlanLimit> $limit
     */
    #[JsonProperty('limit')]
    public string $limit;

    /**
     * @var value-of<Plan> $plan
     */
    #[JsonProperty('plan')]
    public string $plan;

    /**
     * @var ?value-of<PaidPlan> $planWithRoom
     */
    #[JsonProperty('planWithRoom')]
    public ?string $planWithRoom;

    /**
     * @var int $used
     */
    #[JsonProperty('used')]
    public int $used;

    /**
     * @param array{
     *   tag: value-of<PlanLimitReachedEncodedTag>,
     *   allowed: int,
     *   billingUrl: string,
     *   limit: value-of<PlanLimit>,
     *   plan: value-of<Plan>,
     *   used: int,
     *   planWithRoom?: ?value-of<PaidPlan>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->allowed = $values['allowed'];
        $this->billingUrl = $values['billingUrl'];
        $this->limit = $values['limit'];
        $this->plan = $values['plan'];
        $this->planWithRoom = $values['planWithRoom'] ?? null;
        $this->used = $values['used'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
