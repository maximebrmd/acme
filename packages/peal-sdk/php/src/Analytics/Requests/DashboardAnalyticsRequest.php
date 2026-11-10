<?php

namespace Peal\Analytics\Requests;

use Peal\Core\Json\JsonSerializableType;

class DashboardAnalyticsRequest extends JsonSerializableType
{
    /**
     * @var ?string $days
     */
    public ?string $days;

    /**
     * @var ?string $from
     */
    public ?string $from;

    /**
     * @var string $timeZone
     */
    public string $timeZone;

    /**
     * @var ?string $to
     */
    public ?string $to;

    /**
     * @var ?string $topPosts
     */
    public ?string $topPosts;

    /**
     * @param array{
     *   timeZone: string,
     *   days?: ?string,
     *   from?: ?string,
     *   to?: ?string,
     *   topPosts?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->days = $values['days'] ?? null;
        $this->from = $values['from'] ?? null;
        $this->timeZone = $values['timeZone'];
        $this->to = $values['to'] ?? null;
        $this->topPosts = $values['topPosts'] ?? null;
    }
}
