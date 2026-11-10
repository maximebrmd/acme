<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ActivityActorApiKey extends JsonSerializableType
{
    /**
     * @var string $apiKeyId
     */
    #[JsonProperty('apiKeyId')]
    public string $apiKeyId;

    /**
     * @param array{
     *   apiKeyId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->apiKeyId = $values['apiKeyId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
