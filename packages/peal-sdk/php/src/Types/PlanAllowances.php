<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class PlanAllowances extends JsonSerializableType
{
    /**
     * @var ?int $assistantRequests
     */
    #[JsonProperty('assistantRequests')]
    public ?int $assistantRequests;

    /**
     * @var ?int $channels
     */
    #[JsonProperty('channels')]
    public ?int $channels;

    /**
     * @var ?int $members
     */
    #[JsonProperty('members')]
    public ?int $members;

    /**
     * @var ?int $scheduledPosts
     */
    #[JsonProperty('scheduledPosts')]
    public ?int $scheduledPosts;

    /**
     * @param array{
     *   assistantRequests?: ?int,
     *   channels?: ?int,
     *   members?: ?int,
     *   scheduledPosts?: ?int,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->assistantRequests = $values['assistantRequests'] ?? null;
        $this->channels = $values['channels'] ?? null;
        $this->members = $values['members'] ?? null;
        $this->scheduledPosts = $values['scheduledPosts'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
