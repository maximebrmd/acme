<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class FeedItem extends JsonSerializableType
{
    /**
     * @var ?string $itemAt
     */
    #[JsonProperty('itemAt')]
    public ?string $itemAt;

    /**
     * @var value-of<FeedItemOutcome> $outcome
     */
    #[JsonProperty('outcome')]
    public string $outcome;

    /**
     * @var ?value-of<FeedPictureSkip> $pictureSkipped
     */
    #[JsonProperty('pictureSkipped')]
    public ?string $pictureSkipped;

    /**
     * @var ?string $postId
     */
    #[JsonProperty('postId')]
    public ?string $postId;

    /**
     * @var ?value-of<FeedItemReason> $reason
     */
    #[JsonProperty('reason')]
    public ?string $reason;

    /**
     * @var string $seenAt
     */
    #[JsonProperty('seenAt')]
    public string $seenAt;

    /**
     * @param array{
     *   outcome: value-of<FeedItemOutcome>,
     *   seenAt: string,
     *   itemAt?: ?string,
     *   pictureSkipped?: ?value-of<FeedPictureSkip>,
     *   postId?: ?string,
     *   reason?: ?value-of<FeedItemReason>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->itemAt = $values['itemAt'] ?? null;
        $this->outcome = $values['outcome'];
        $this->pictureSkipped = $values['pictureSkipped'] ?? null;
        $this->postId = $values['postId'] ?? null;
        $this->reason = $values['reason'] ?? null;
        $this->seenAt = $values['seenAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
