<?php

namespace Peal\Analytics\Requests;

use Peal\Core\Json\JsonSerializableType;

class BestTimesAnalyticsRequest extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    public string $channelId;

    /**
     * @var ?string $days
     */
    public ?string $days;

    /**
     * @var string $timeZone
     */
    public string $timeZone;

    /**
     * @param array{
     *   channelId: string,
     *   timeZone: string,
     *   days?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->days = $values['days'] ?? null;
        $this->timeZone = $values['timeZone'];
    }
}
