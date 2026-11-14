<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class UsageAllowanceReachedEncoded extends JsonSerializableType
{
    /**
     * @var value-of<UsageAllowanceReachedEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

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
     * @var value-of<Meter> $meter
     */
    #[JsonProperty('meter')]
    public string $meter;

    /**
     * @var value-of<AllowanceReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var string $resetsAt
     */
    #[JsonProperty('resetsAt')]
    public string $resetsAt;

    /**
     * @var int $used
     */
    #[JsonProperty('used')]
    public int $used;

    /**
     * @param array{
     *   tag: value-of<UsageAllowanceReachedEncodedTag>,
     *   allowed: int,
     *   billingUrl: string,
     *   meter: value-of<Meter>,
     *   reason: value-of<AllowanceReason>,
     *   resetsAt: string,
     *   used: int,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->allowed = $values['allowed'];
        $this->billingUrl = $values['billingUrl'];
        $this->meter = $values['meter'];
        $this->reason = $values['reason'];
        $this->resetsAt = $values['resetsAt'];
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
