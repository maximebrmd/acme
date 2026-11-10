<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class BillingUnavailableEncoded extends JsonSerializableType
{
    /**
     * @var string $workspaceId
     */
    #[JsonProperty('workspaceId')]
    public string $workspaceId;

    /**
     * @param array{
     *   workspaceId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->workspaceId = $values['workspaceId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
