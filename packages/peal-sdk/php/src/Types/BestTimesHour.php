<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\Union;

class BestTimesHour extends JsonSerializableType
{
    /**
     * @var int $hour
     */
    #[JsonProperty('hour')]
    public int $hour;

    /**
     * @var (
     *    float
     *   |value-of<NonFiniteNumber>
     * )|null $median
     */
    #[JsonProperty('median'), Union('float', 'string', 'null')]
    public float|string|null $median;

    /**
     * @var int $posts
     */
    #[JsonProperty('posts')]
    public int $posts;

    /**
     * @var value-of<Weekday> $weekday
     */
    #[JsonProperty('weekday')]
    public string $weekday;

    /**
     * @param array{
     *   hour: int,
     *   posts: int,
     *   weekday: value-of<Weekday>,
     *   median?: (
     *    float
     *   |value-of<NonFiniteNumber>
     * )|null,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->hour = $values['hour'];
        $this->median = $values['median'] ?? null;
        $this->posts = $values['posts'];
        $this->weekday = $values['weekday'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
