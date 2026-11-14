<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class XUsage extends JsonSerializableType
{
    /**
     * @var bool $reads
     */
    #[JsonProperty('reads')]
    public bool $reads;

    /**
     * @var ?string $setAt
     */
    #[JsonProperty('setAt')]
    public ?string $setAt;

    /**
     * @param array{
     *   reads: bool,
     *   setAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reads = $values['reads'];
        $this->setAt = $values['setAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
