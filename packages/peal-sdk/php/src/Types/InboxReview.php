<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class InboxReview extends JsonSerializableType
{
    /**
     * @var string $id
     */
    #[JsonProperty('id')]
    public string $id;

    /**
     * @var bool $markedAnswered
     */
    #[JsonProperty('markedAnswered')]
    public bool $markedAnswered;

    /**
     * @var int $photos
     */
    #[JsonProperty('photos')]
    public int $photos;

    /**
     * @var int $rating
     */
    #[JsonProperty('rating')]
    public int $rating;

    /**
     * @var string $receivedAt
     */
    #[JsonProperty('receivedAt')]
    public string $receivedAt;

    /**
     * @var ?InboxOwnerReply $reply
     */
    #[JsonProperty('reply')]
    public ?InboxOwnerReply $reply;

    /**
     * @var ?string $reviewerName
     */
    #[JsonProperty('reviewerName')]
    public ?string $reviewerName;

    /**
     * @var value-of<InboxReviewState> $state
     */
    #[JsonProperty('state')]
    public string $state;

    /**
     * @var string $text
     */
    #[JsonProperty('text')]
    public string $text;

    /**
     * @var string $threadId
     */
    #[JsonProperty('threadId')]
    public string $threadId;

    /**
     * @var string $updatedAt
     */
    #[JsonProperty('updatedAt')]
    public string $updatedAt;

    /**
     * @var string $writtenAt
     */
    #[JsonProperty('writtenAt')]
    public string $writtenAt;

    /**
     * @param array{
     *   id: string,
     *   markedAnswered: bool,
     *   photos: int,
     *   rating: int,
     *   receivedAt: string,
     *   state: value-of<InboxReviewState>,
     *   text: string,
     *   threadId: string,
     *   updatedAt: string,
     *   writtenAt: string,
     *   reply?: ?InboxOwnerReply,
     *   reviewerName?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->id = $values['id'];
        $this->markedAnswered = $values['markedAnswered'];
        $this->photos = $values['photos'];
        $this->rating = $values['rating'];
        $this->receivedAt = $values['receivedAt'];
        $this->reply = $values['reply'] ?? null;
        $this->reviewerName = $values['reviewerName'] ?? null;
        $this->state = $values['state'];
        $this->text = $values['text'];
        $this->threadId = $values['threadId'];
        $this->updatedAt = $values['updatedAt'];
        $this->writtenAt = $values['writtenAt'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
