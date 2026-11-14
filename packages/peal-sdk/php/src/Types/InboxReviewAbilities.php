<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxReviewAbilities extends JsonSerializableType
{
    /**
     * @var value-of<InboxAbilityStanding> $read
     */
    #[JsonProperty('read')]
    public string $read;

    /**
     * @var value-of<InboxAbilityStanding> $reply
     */
    #[JsonProperty('reply')]
    public string $reply;

    /**
     * @var value-of<InboxAbilityStanding> $withdraw
     */
    #[JsonProperty('withdraw')]
    public string $withdraw;

    /**
     * @param array{
     *   read: value-of<InboxAbilityStanding>,
     *   reply: value-of<InboxAbilityStanding>,
     *   withdraw: value-of<InboxAbilityStanding>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->read = $values['read'];
        $this->reply = $values['reply'];
        $this->withdraw = $values['withdraw'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
