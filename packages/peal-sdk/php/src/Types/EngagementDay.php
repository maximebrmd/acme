<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class EngagementDay extends JsonSerializableType
{
    /**
     * @var string $date
     */
    #[JsonProperty('date')]
    public string $date;

    /**
     * @var int $likes
     */
    #[JsonProperty('likes')]
    public int $likes;

    /**
     * @var int $quotes
     */
    #[JsonProperty('quotes')]
    public int $quotes;

    /**
     * @var int $replies
     */
    #[JsonProperty('replies')]
    public int $replies;

    /**
     * @var int $reposts
     */
    #[JsonProperty('reposts')]
    public int $reposts;

    /**
     * @param array{
     *   date: string,
     *   likes: int,
     *   quotes: int,
     *   replies: int,
     *   reposts: int,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->date = $values['date'];
        $this->likes = $values['likes'];
        $this->quotes = $values['quotes'];
        $this->replies = $values['replies'];
        $this->reposts = $values['reposts'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
