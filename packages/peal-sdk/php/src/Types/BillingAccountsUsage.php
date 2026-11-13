<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BillingAccountsUsage extends JsonSerializableType
{
    /**
     * @var ?int $accountDays
     */
    #[JsonProperty('accountDays')]
    public ?int $accountDays;

    /**
     * @var int $connected
     */
    #[JsonProperty('connected')]
    public int $connected;

    /**
     * @var ?Money $estimate
     */
    #[JsonProperty('estimate')]
    public ?Money $estimate;

    /**
     * @var ?Money $nextAccount
     */
    #[JsonProperty('nextAccount')]
    public ?Money $nextAccount;

    /**
     * @var int $pooled
     */
    #[JsonProperty('pooled')]
    public int $pooled;

    /**
     * @param array{
     *   connected: int,
     *   pooled: int,
     *   accountDays?: ?int,
     *   estimate?: ?Money,
     *   nextAccount?: ?Money,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accountDays = $values['accountDays'] ?? null;
        $this->connected = $values['connected'];
        $this->estimate = $values['estimate'] ?? null;
        $this->nextAccount = $values['nextAccount'] ?? null;
        $this->pooled = $values['pooled'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
