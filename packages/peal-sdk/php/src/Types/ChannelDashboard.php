<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelDashboard extends JsonSerializableType
{
    /**
     * @var FollowerChange $followers
     */
    #[JsonProperty('followers')]
    public FollowerChange $followers;

    /**
     * @var FollowerChange $previousFollowers
     */
    #[JsonProperty('previousFollowers')]
    public FollowerChange $previousFollowers;

    /**
     * @var bool $previousKept Whether the range before is still all kept. False when a platform's terms keep its numbers for less than the range before goes back (Pinterest 90 days, LinkedIn pages a year): previousTotals and previousFollowers then miss what was deleted, and no change against them should be shown.
     */
    #[JsonProperty('previousKept')]
    public bool $previousKept;

    /**
     * @var DashboardTotals $previousTotals
     */
    #[JsonProperty('previousTotals')]
    public DashboardTotals $previousTotals;

    /**
     * @var DashboardTotals $totals
     */
    #[JsonProperty('totals')]
    public DashboardTotals $totals;

    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var ?value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @param array{
     *   followers: FollowerChange,
     *   previousFollowers: FollowerChange,
     *   previousKept: bool,
     *   previousTotals: DashboardTotals,
     *   totals: DashboardTotals,
     *   channelId: string,
     *   platform?: ?value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->followers = $values['followers'];
        $this->previousFollowers = $values['previousFollowers'];
        $this->previousKept = $values['previousKept'];
        $this->previousTotals = $values['previousTotals'];
        $this->totals = $values['totals'];
        $this->channelId = $values['channelId'];
        $this->platform = $values['platform'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
