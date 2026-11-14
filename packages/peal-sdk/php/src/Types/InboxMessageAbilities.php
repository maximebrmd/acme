<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxMessageAbilities extends JsonSerializableType
{
    /**
     * @var value-of<InboxAbilityStanding> $read
     */
    #[JsonProperty('read')]
    public string $read;

    /**
     * @var value-of<InboxAbilityStanding> $send
     */
    #[JsonProperty('send')]
    public string $send;

    /**
     * @param array{
     *   read: value-of<InboxAbilityStanding>,
     *   send: value-of<InboxAbilityStanding>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->read = $values['read'];
        $this->send = $values['send'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
