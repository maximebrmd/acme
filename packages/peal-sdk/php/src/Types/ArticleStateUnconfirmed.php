<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleStateUnconfirmed extends JsonSerializableType
{
    /**
     * @var string $scheduledAt
     */
    #[JsonProperty('scheduledAt')]
    public string $scheduledAt;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @var string $attemptedAt
     */
    #[JsonProperty('attemptedAt')]
    public string $attemptedAt;

    /**
     * @var value-of<UnconfirmedReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   scheduledAt: string,
     *   timeZone: string,
     *   attemptedAt: string,
     *   reason: value-of<UnconfirmedReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->scheduledAt = $values['scheduledAt'];
        $this->timeZone = $values['timeZone'];
        $this->attemptedAt = $values['attemptedAt'];
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
