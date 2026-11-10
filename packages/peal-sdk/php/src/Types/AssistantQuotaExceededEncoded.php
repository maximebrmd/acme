<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantQuotaExceededEncoded extends JsonSerializableType
{
    /**
     * @var value-of<AssistantQuotaExceededEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var ?string $billingUrl
     */
    #[JsonProperty('billingUrl')]
    public ?string $billingUrl;

    /**
     * @var int $dailyLimit
     */
    #[JsonProperty('dailyLimit')]
    public int $dailyLimit;

    /**
     * @var ?value-of<Plan> $plan
     */
    #[JsonProperty('plan')]
    public ?string $plan;

    /**
     * @var ?value-of<PaidPlan> $planWithRoom
     */
    #[JsonProperty('planWithRoom')]
    public ?string $planWithRoom;

    /**
     * @var string $resetsAt
     */
    #[JsonProperty('resetsAt')]
    public string $resetsAt;

    /**
     * @param array{
     *   tag: value-of<AssistantQuotaExceededEncodedTag>,
     *   dailyLimit: int,
     *   resetsAt: string,
     *   billingUrl?: ?string,
     *   plan?: ?value-of<Plan>,
     *   planWithRoom?: ?value-of<PaidPlan>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->billingUrl = $values['billingUrl'] ?? null;
        $this->dailyLimit = $values['dailyLimit'];
        $this->plan = $values['plan'] ?? null;
        $this->planWithRoom = $values['planWithRoom'] ?? null;
        $this->resetsAt = $values['resetsAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
