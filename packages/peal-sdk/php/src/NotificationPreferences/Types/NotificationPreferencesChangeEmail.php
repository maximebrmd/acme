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
     * @var ?bool $webhookFailing
     */
    #[JsonProperty('webhookFailing')]
    public ?bool $webhookFailing;

    /**
     * @param array{
     *   channelReconnect?: ?bool,
     *   comments?: ?bool,
     *   postFailed?: ?bool,
     *   postPublished?: ?bool,
     *   postReview?: ?bool,
     *   postUnconfirmed?: ?bool,
     *   webhookFailing?: ?bool,
     * } $values
     */
    public function __construct(
        array $values = [],
    ) {
        $this->channelReconnect = $values['channelReconnect'] ?? null;
        $this->comments = $values['comments'] ?? null;
        $this->postFailed = $values['postFailed'] ?? null;
        $this->postPublished = $values['postPublished'] ?? null;
        $this->postReview = $values['postReview'] ?? null;
        $this->postUnconfirmed = $values['postUnconfirmed'] ?? null;
        $this->webhookFailing = $values['webhookFailing'] ?? null;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
