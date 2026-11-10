<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ApprovalRequestDecision extends JsonSerializableType
{
    /**
     * @var string $at
     */
    #[JsonProperty('at')]
    public string $at;

    /**
     * @var Reviewer $by
     */
    #[JsonProperty('by')]
    public Reviewer $by;

    /**
     * @param array{
     *   at: string,
     *   by: Reviewer,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->at = $values['at'];
        $this->by = $values['by'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
