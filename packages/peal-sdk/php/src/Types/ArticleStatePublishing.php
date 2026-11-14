<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleStatePublishing extends JsonSerializableType
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
     * @var string $since
     */
    #[JsonProperty('since')]
    public string $since;

    /**
     * @param array{
     *   scheduledAt: string,
     *   timeZone: string,
     *   since: string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->scheduledAt = $values['scheduledAt'];
        $this->timeZone = $values['timeZone'];
        $this->since = $values['since'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
