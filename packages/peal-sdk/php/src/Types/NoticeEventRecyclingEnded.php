<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventRecyclingEnded extends JsonSerializableType
{
    /**
     * @var value-of<RecyclingNoticeReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var string $ruleId
     */
    #[JsonProperty('ruleId')]
    public string $ruleId;

    /**
     * @var string $sourcePostId
     */
    #[JsonProperty('sourcePostId')]
    public string $sourcePostId;

    /**
     * @param array{
     *   reason: value-of<RecyclingNoticeReason>,
     *   ruleId: string,
     *   sourcePostId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reason = $values['reason'];
        $this->ruleId = $values['ruleId'];
        $this->sourcePostId = $values['sourcePostId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
