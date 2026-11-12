<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventFeedStopped extends JsonSerializableType
{
    /**
     * @var string $feedId
     */
    #[JsonProperty('feedId')]
    public string $feedId;

    /**
     * @var value-of<FeedStopReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   feedId: string,
     *   reason: value-of<FeedStopReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->feedId = $values['feedId'];
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
