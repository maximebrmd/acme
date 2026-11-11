<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class UsageSharing extends JsonSerializableType
{
    /**
     * @var string $partnerWorkspaceId
     */
    #[JsonProperty('partnerWorkspaceId')]
    public string $partnerWorkspaceId;

    /**
     * @param array{
     *   partnerWorkspaceId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->partnerWorkspaceId = $values['partnerWorkspaceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
