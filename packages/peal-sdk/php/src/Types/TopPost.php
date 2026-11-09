<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class TopPost extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var int $engagement
     */
    #[JsonProperty('engagement')]
    public int $engagement;

    /**
     * @var PostMetrics $metrics
     */
    #[JsonProperty('metrics')]
    public PostMetrics $metrics;

    /**
     * @var ?string $permalink
     */
    #[JsonProperty('permalink')]
    public ?string $permalink;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var string $publishedAt
     */
    #[JsonProperty('publishedAt')]
    public string $publishedAt;

    /**
     * @var string $targetId
     */
    #[JsonProperty('targetId')]
    public string $targetId;

    /**
     * @param array{
     *   channelId: string,
     *   engagement: int,
     *   metrics: PostMetrics,
     *   postId: string,
     *   publishedAt: string,
     *   targetId: string,
     *   permalink?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->engagement = $values['engagement'];
        $this->metrics = $values['metrics'];
        $this->permalink = $values['permalink'] ?? null;
        $this->postId = $values['postId'];
        $this->publishedAt = $values['publishedAt'];
        $this->targetId = $values['targetId'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
