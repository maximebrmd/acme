<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class InboxReviewThreadDetail extends JsonSerializableType
{
    /**
     * @var InboxReviewAbilities $abilities
     */
    #[JsonProperty('abilities')]
    public InboxReviewAbilities $abilities;

    /**
     * @var ?value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public ?string $platform;

    /**
     * @var array<InboxReviewReply> $replies
     */
    #[JsonProperty('replies'), ArrayType([InboxReviewReply::class])]
    public array $replies;

    /**
     * @var array<InboxReview> $reviews
     */
    #[JsonProperty('reviews'), ArrayType([InboxReview::class])]
    public array $reviews;

    /**
     * @var InboxReviewThread $thread
     */
    #[JsonProperty('thread')]
    public InboxReviewThread $thread;

    /**
     * @param array{
     *   abilities: InboxReviewAbilities,
     *   replies: array<InboxReviewReply>,
     *   reviews: array<InboxReview>,
     *   thread: InboxReviewThread,
     *   platform?: ?value-of<Platform>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->abilities = $values['abilities'];
        $this->platform = $values['platform'] ?? null;
        $this->replies = $values['replies'];
        $this->reviews = $values['reviews'];
        $this->thread = $values['thread'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
