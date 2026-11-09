<?php

namespace Peal\Posts\Requests;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class SchedulePost extends JsonSerializableType
{
    /**
     * @var string $at
     */
    #[JsonProperty('at')]
    public string $at;

    /**
     * @var array<string> $channelIds
     */
    #[JsonProperty('channelIds'), ArrayType(['string'])]
    public array $channelIds;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @param array{
     *   at: string,
     *   channelIds: array<string>,
     *   timeZone: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->at = $values['at'];
        $this->channelIds = $values['channelIds'];
        $this->timeZone = $values['timeZone'];
    }
}
