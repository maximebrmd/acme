<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Excess extends JsonSerializableType
{
    /**
     * @var int $allowed
     */
    #[JsonProperty('allowed')]
    public int $allowed;

    /**
     * @var value-of<HeldLimit> $limit
     */
    #[JsonProperty('limit')]
    public string $limit;

    /**
     * @var int $used
     */
    #[JsonProperty('used')]
    public int $used;

    /**
     * @param array{
     *   allowed: int,
     *   limit: value-of<HeldLimit>,
     *   used: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->allowed = $values['allowed'];
        $this->limit = $values['limit'];
        $this->used = $values['used'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
