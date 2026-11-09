<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class AnalyticsSummary extends JsonSerializableType
{
    /**
     * @var array<ChannelMetrics> $channels
     */
    #[JsonProperty('channels'), ArrayType([ChannelMetrics::class])]
    public array $channels;

    /**
     * @var array<EngagementDay> $days
     */
    #[JsonProperty('days'), ArrayType([EngagementDay::class])]
    public array $days;

    /**
     * @var string $from
     */
    #[JsonProperty('from')]
    public string $from;

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
     * @var MetricTotals $totals
     */
    #[JsonProperty('totals')]
    public MetricTotals $totals;

    /**
     * @param array{
     *   channels: array<ChannelMetrics>,
     *   days: array<EngagementDay>,
     *   from: string,
     *   timeZone: string,
     *   to: string,
     *   topPosts: array<TopPost>,
     *   totals: MetricTotals,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channels = $values['channels'];
        $this->days = $values['days'];
        $this->from = $values['from'];
        $this->timeZone = $values['timeZone'];
        $this->to = $values['to'];
        $this->topPosts = $values['topPosts'];
        $this->totals = $values['totals'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
