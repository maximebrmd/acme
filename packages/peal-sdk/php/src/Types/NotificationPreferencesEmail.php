<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NotificationPreferencesEmail extends JsonSerializableType
{
    /**
     * @var bool $channelReconnect
     */
    #[JsonProperty('channelReconnect')]
    public bool $channelReconnect;

    /**
     * @var bool $comments
     */
    #[JsonProperty('comments')]
    public bool $comments;

    /**
     * @var bool $postFailed
     */
    #[JsonProperty('postFailed')]
    public bool $postFailed;

    /**
     * @var bool $postPublished
     */
    #[JsonProperty('postPublished')]
    public bool $postPublished;

    /**
     * @var bool $postReview
     */
    #[JsonProperty('postReview')]
    public bool $postReview;

    /**
     * @var bool $postUnconfirmed
     */
    #[JsonProperty('postUnconfirmed')]
    public bool $postUnconfirmed;

    /**
     * @var bool $webhookFailing
     */
    #[JsonProperty('webhookFailing')]
    public bool $webhookFailing;

    /**
     * @param array{
     *   channelReconnect: bool,
     *   comments: bool,
     *   postFailed: bool,
     *   postPublished: bool,
     *   postReview: bool,
     *   postUnconfirmed: bool,
     *   webhookFailing: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelReconnect = $values['channelReconnect'];
        $this->comments = $values['comments'];
        $this->postFailed = $values['postFailed'];
        $this->postPublished = $values['postPublished'];
        $this->postReview = $values['postReview'];
        $this->postUnconfirmed = $values['postUnconfirmed'];
        $this->webhookFailing = $values['webhookFailing'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
