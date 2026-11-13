<?php

namespace Peal\NotificationPreferences\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NotificationPreferencesChangeEmail extends JsonSerializableType
{
    /**
     * @var ?bool $channelReconnect
     */
    #[JsonProperty('channelReconnect')]
    public ?bool $channelReconnect;

    /**
     * @var ?bool $comments
     */
    #[JsonProperty('comments')]
    public ?bool $comments;

    /**
     * @var ?bool $feedStopped
     */
    #[JsonProperty('feedStopped')]
    public ?bool $feedStopped;

    /**
     * @var ?bool $postFailed
     */
    #[JsonProperty('postFailed')]
    public ?bool $postFailed;

    /**
     * @var ?bool $postPublished
     */
    #[JsonProperty('postPublished')]
    public ?bool $postPublished;

    /**
     * @var ?bool $postReview
     */
    #[JsonProperty('postReview')]
    public ?bool $postReview;

    /**
     * @var ?bool $postUnconfirmed
     */
    #[JsonProperty('postUnconfirmed')]
    public ?bool $postUnconfirmed;

    /**
     * @var ?bool $recyclingEnded
     */
    #[JsonProperty('recyclingEnded')]
    public ?bool $recyclingEnded;

    /**
     * @var ?bool $webhookFailing
     */
    #[JsonProperty('webhookFailing')]
    public ?bool $webhookFailing;

    /**
     * @var ?bool $weeklyDigest
     */
    #[JsonProperty('weeklyDigest')]
    public ?bool $weeklyDigest;

    /**
     * @param array{
     *   channelReconnect?: ?bool,
     *   comments?: ?bool,
     *   feedStopped?: ?bool,
     *   postFailed?: ?bool,
     *   postPublished?: ?bool,
     *   postReview?: ?bool,
     *   postUnconfirmed?: ?bool,
     *   recyclingEnded?: ?bool,
     *   webhookFailing?: ?bool,
     *   weeklyDigest?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelReconnect = $values['channelReconnect'] ?? null;
        $this->comments = $values['comments'] ?? null;
        $this->feedStopped = $values['feedStopped'] ?? null;
        $this->postFailed = $values['postFailed'] ?? null;
        $this->postPublished = $values['postPublished'] ?? null;
        $this->postReview = $values['postReview'] ?? null;
        $this->postUnconfirmed = $values['postUnconfirmed'] ?? null;
        $this->recyclingEnded = $values['recyclingEnded'] ?? null;
        $this->webhookFailing = $values['webhookFailing'] ?? null;
        $this->weeklyDigest = $values['weeklyDigest'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
