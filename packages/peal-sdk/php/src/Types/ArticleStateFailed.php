<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleStateFailed extends JsonSerializableType
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
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var string $failedAt
     */
    #[JsonProperty('failedAt')]
    public string $failedAt;

    /**
     * @var value-of<FailureReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   scheduledAt: string,
     *   timeZone: string,
     *   failedAt: string,
     *   reason: value-of<FailureReason>,
     *   code?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->scheduledAt = $values['scheduledAt'];
        $this->timeZone = $values['timeZone'];
        $this->code = $values['code'] ?? null;
        $this->failedAt = $values['failedAt'];
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
