<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class NoticeEventFollowUpsNotSent extends JsonSerializableType
{
    /**
     * @var int $count
     */
    #[JsonProperty('count')]
    public int $count;

    /**
     * @var array<value-of<FollowUpNotSentReason>> $reasons
     */
    #[JsonProperty('reasons'), ArrayType(['string'])]
    public array $reasons;

    /**
     * @var string $ruleId
     */
    #[JsonProperty('ruleId')]
    public string $ruleId;

    /**
     * @param array{
     *   count: int,
     *   reasons: array<value-of<FollowUpNotSentReason>>,
     *   ruleId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->count = $values['count'];
        $this->reasons = $values['reasons'];
        $this->ruleId = $values['ruleId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
