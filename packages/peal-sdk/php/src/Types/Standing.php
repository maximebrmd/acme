<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class Standing extends JsonSerializableType
{
    /**
     * @var BillingAccount $account
     */
    #[JsonProperty('account')]
    public BillingAccount $account;

    /**
     * @var bool $mustReduce
     */
    #[JsonProperty('mustReduce')]
    public bool $mustReduce;

    /**
     * @var array<Excess> $over
     */
    #[JsonProperty('over'), ArrayType([Excess::class])]
    public array $over;

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
     * @var int $scheduledPosts
     */
    #[JsonProperty('scheduledPosts')]
    public int $scheduledPosts;

    /**
     * @param array{
     *   account: BillingAccount,
     *   mustReduce: bool,
     *   over: array<Excess>,
     *   scheduledPosts: int,
     *   plan?: ?value-of<Plan>,
     *   planWithRoom?: ?value-of<PaidPlan>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->account = $values['account'];
        $this->mustReduce = $values['mustReduce'];
        $this->over = $values['over'];
        $this->plan = $values['plan'] ?? null;
        $this->planWithRoom = $values['planWithRoom'] ?? null;
        $this->scheduledPosts = $values['scheduledPosts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
