<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxMessageApplication extends JsonSerializableType
{
    /**
     * @var string $clientId
     */
    #[JsonProperty('clientId')]
    public string $clientId;

    /**
     * @var string $grantedAt
     */
    #[JsonProperty('grantedAt')]
    public string $grantedAt;

    /**
     * @var ?string $grantedBy
     */
    #[JsonProperty('grantedBy')]
    public ?string $grantedBy;

    /**
     * @param array{
     *   clientId: string,
     *   grantedAt: string,
     *   grantedBy?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->clientId = $values['clientId'];
        $this->grantedAt = $values['grantedAt'];
        $this->grantedBy = $values['grantedBy'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
