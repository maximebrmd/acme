<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PlanLimitReachedEncoded extends JsonSerializableType
{
    /**
     * @var value-of<PlanLimitReachedEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var int $allowed
     */
    #[JsonProperty('allowed')]
    public int $allowed;

    /**
     * @var value-of<PlanLimit> $limit
     */
    #[JsonProperty('limit')]
    public string $limit;

    /**
     * @param array{
     *   tag: value-of<PlanLimitReachedEncodedTag>,
     *   allowed: int,
     *   limit: value-of<PlanLimit>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->allowed = $values['allowed'];
        $this->limit = $values['limit'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
