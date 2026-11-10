<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AssistantQuotaExceededEncoded extends JsonSerializableType
{
    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $message
     */
    #[JsonProperty('message')]
    public ?string $message;

    /**
     * @var ?string $requestId
     */
    #[JsonProperty('requestId')]
    public ?string $requestId;

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
     *   dailyLimit: int,
     *   resetsAt: string,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     *   billingUrl?: ?string,
     *   plan?: ?value-of<Plan>,
     *   planWithRoom?: ?value-of<PaidPlan>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
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
