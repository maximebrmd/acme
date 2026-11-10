<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AnalyticsDashboard extends JsonSerializableType
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
     * @var array<ChannelDashboard> $channels
     */
    #[JsonProperty('channels'), ArrayType([ChannelDashboard::class])]
    public array $channels;

    /**
     * @var array<DashboardDay> $days
     */
    #[JsonProperty('days'), ArrayType([DashboardDay::class])]
    public array $days;

    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

    /**
     * @var array<PlatformDashboard> $platforms
     */
    #[JsonProperty('platforms'), ArrayType([PlatformDashboard::class])]
    public array $platforms;

    /**
     * @var AnalyticsDashboardPrevious $previous
     */
    #[JsonProperty('previous')]
    public AnalyticsDashboardPrevious $previous;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @var string $to
     */
    #[JsonProperty('to')]
    public string $to;

    /**
     * @var array<TopPost> $topPosts
     */
    #[JsonProperty('topPosts'), ArrayType([TopPost::class])]
    public array $topPosts;

    /**
     * @param array{
     *   followers: FollowerChange,
     *   previousFollowers: FollowerChange,
     *   previousTotals: DashboardTotals,
     *   totals: DashboardTotals,
     *   channels: array<ChannelDashboard>,
     *   days: array<DashboardDay>,
     *   from: string,
     *   platforms: array<PlatformDashboard>,
     *   previous: AnalyticsDashboardPrevious,
     *   timeZone: string,
     *   to: string,
     *   topPosts: array<TopPost>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->followers = $values['followers'];
        $this->previousFollowers = $values['previousFollowers'];
        $this->previousTotals = $values['previousTotals'];
        $this->totals = $values['totals'];
        $this->channels = $values['channels'];
        $this->days = $values['days'];
        $this->from = $values['from'];
        $this->platforms = $values['platforms'];
        $this->previous = $values['previous'];
        $this->timeZone = $values['timeZone'];
        $this->to = $values['to'];
        $this->topPosts = $values['topPosts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
