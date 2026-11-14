<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ArticleStatePublished extends JsonSerializableType
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
     * @var ?string $editedAt
     */
    #[JsonProperty('editedAt')]
    public ?string $editedAt;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var string $platformPostId
     */
    #[JsonProperty('platformPostId')]
    public string $platformPostId;

    /**
     * @var string $publishedAt
     */
    #[JsonProperty('publishedAt')]
    public string $publishedAt;

    /**
     * @var ?string $removedAt
     */
    #[JsonProperty('removedAt')]
    public ?string $removedAt;

    /**
     * @param array{
     *   scheduledAt: string,
     *   timeZone: string,
     *   platformPostId: string,
     *   publishedAt: string,
     *   editedAt?: ?string,
     *   permalink?: ?string,
     *   removedAt?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->scheduledAt = $values['scheduledAt'];
        $this->timeZone = $values['timeZone'];
        $this->editedAt = $values['editedAt'] ?? null;
        $this->permalink = $values['permalink'] ?? null;
        $this->platformPostId = $values['platformPostId'];
        $this->publishedAt = $values['publishedAt'];
        $this->removedAt = $values['removedAt'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
