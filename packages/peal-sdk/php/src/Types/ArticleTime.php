<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleTime extends JsonSerializableType
{
    /**
     * @var ?string $at
     */
    #[JsonProperty('at')]
    public ?string $at;

    /**
     * @var string $timeZone
     */
    #[JsonProperty('timeZone')]
    public string $timeZone;

    /**
     * @param array{
     *   timeZone: string,
     *   at?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->at = $values['at'] ?? null;
        $this->timeZone = $values['timeZone'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
