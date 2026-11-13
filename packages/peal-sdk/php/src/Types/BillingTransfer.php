<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BillingTransfer extends JsonSerializableType
{
    /**
     * @var string $expiresAt
     */
    #[JsonProperty('expiresAt')]
    public string $expiresAt;

    /**
     * @var string $offeredAt
     */
    #[JsonProperty('offeredAt')]
    public string $offeredAt;

    /**
     * @var string $offeredBy
     */
    #[JsonProperty('offeredBy')]
    public string $offeredBy;

    /**
     * @var string $toUserId
     */
    #[JsonProperty('toUserId')]
    public string $toUserId;

    /**
     * @param array{
     *   expiresAt: string,
     *   offeredAt: string,
     *   offeredBy: string,
     *   toUserId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->expiresAt = $values['expiresAt'];
        $this->offeredAt = $values['offeredAt'];
        $this->offeredBy = $values['offeredBy'];
        $this->toUserId = $values['toUserId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
