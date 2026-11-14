<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventFollowUpRuleStopped extends JsonSerializableType
{
    /**
     * @var value-of<AutomationStopReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @var string $ruleId
     */
    #[JsonProperty('ruleId')]
    public string $ruleId;

    /**
     * @param array{
     *   reason: value-of<AutomationStopReason>,
     *   ruleId: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->reason = $values['reason'];
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
