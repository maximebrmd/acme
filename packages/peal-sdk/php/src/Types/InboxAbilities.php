<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxAbilities extends JsonSerializableType
{
    /**
     * @var value-of<InboxAbilityStanding> $delete
     */
    #[JsonProperty('delete')]
    public string $delete;

    /**
     * @var value-of<InboxAbilityStanding> $hide
     */
    #[JsonProperty('hide')]
    public string $hide;

    /**
     * @var value-of<InboxAbilityStanding> $like
     */
    #[JsonProperty('like')]
    public string $like;

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
     *   delete: value-of<InboxAbilityStanding>,
     *   hide: value-of<InboxAbilityStanding>,
     *   like: value-of<InboxAbilityStanding>,
     *   read: value-of<InboxAbilityStanding>,
     *   reply: value-of<InboxAbilityStanding>,
     *   withdraw: value-of<InboxAbilityStanding>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->delete = $values['delete'];
        $this->hide = $values['hide'];
        $this->like = $values['like'];
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
