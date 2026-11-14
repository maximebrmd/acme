<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxParticipant extends JsonSerializableType
{
    /**
     * @var ?string $displayName
     */
    #[JsonProperty('displayName')]
    public ?string $displayName;

    /**
     * @var string $handle
     */
    #[JsonProperty('handle')]
    public string $handle;

    /**
     * @var string $platformId
     */
    #[JsonProperty('platformId')]
    public string $platformId;

    /**
     * @param array{
     *   handle: string,
     *   platformId: string,
     *   displayName?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->displayName = $values['displayName'] ?? null;
        $this->handle = $values['handle'];
        $this->platformId = $values['platformId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
