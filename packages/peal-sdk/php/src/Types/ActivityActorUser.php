<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ActivityActorUser extends JsonSerializableType
{
    /**
     * @var ?string $userId
     */
    #[JsonProperty('userId')]
    public ?string $userId;

    /**
     * @param array{
     *   userId?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->userId = $values['userId'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
