<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class AccountStandingUnread extends JsonSerializableType
{
    /**
     * @var value-of<AccountUnreadReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   reason: value-of<AccountUnreadReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
