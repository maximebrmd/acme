<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class Usage extends JsonSerializableType
{
    /**
     * @var PeriodUsage $assistantRequests
     */
    #[JsonProperty('assistantRequests')]
    public PeriodUsage $assistantRequests;

    /**
     * @var int $channels
     */
    #[JsonProperty('channels')]
    public int $channels;

    /**
     * @var int $members
     */
    #[JsonProperty('members')]
    public int $members;

    /**
     * @var PeriodUsage $scheduledPosts
     */
    #[JsonProperty('scheduledPosts')]
    public PeriodUsage $scheduledPosts;

    /**
     * @param array{
     *   assistantRequests: PeriodUsage,
     *   channels: int,
     *   members: int,
     *   scheduledPosts: PeriodUsage,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->assistantRequests = $values['assistantRequests'];
        $this->channels = $values['channels'];
        $this->members = $values['members'];
        $this->scheduledPosts = $values['scheduledPosts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
