<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventPaymentMethodNeeded extends JsonSerializableType
{
    /**
     * @var int $accounts
     */
    #[JsonProperty('accounts')]
    public int $accounts;

    /**
     * @var int $allowed
     */
    #[JsonProperty('allowed')]
    public int $allowed;

    /**
     * @var string $graceUntil
     */
    #[JsonProperty('graceUntil')]
    public string $graceUntil;

    /**
     * @param array{
     *   accounts: int,
     *   allowed: int,
     *   graceUntil: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->accounts = $values['accounts'];
        $this->allowed = $values['allowed'];
        $this->graceUntil = $values['graceUntil'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
