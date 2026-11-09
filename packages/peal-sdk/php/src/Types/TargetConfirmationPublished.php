<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TargetConfirmationPublished extends JsonSerializableType
{
    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @param array{
     *   permalink?: ?string,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->permalink = $values['permalink'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
