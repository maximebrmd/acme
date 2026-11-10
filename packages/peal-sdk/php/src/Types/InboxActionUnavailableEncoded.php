<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxActionUnavailableEncoded extends JsonSerializableType
{
    /**
     * @var string $ability
     */
    #[JsonProperty('ability')]
    public string $ability;

    /**
     * @var value-of<InboxActionUnavailableEncodedStanding> $standing
     */
    #[JsonProperty('standing')]
    public string $standing;

    /**
     * @param array{
     *   ability: string,
     *   standing: value-of<InboxActionUnavailableEncodedStanding>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->ability = $values['ability'];
        $this->standing = $values['standing'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
