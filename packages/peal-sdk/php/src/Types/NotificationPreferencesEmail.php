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
     * @var bool $postUnconfirmed
     */
    #[JsonProperty('postUnconfirmed')]
    public bool $postUnconfirmed;

    /**
     * @param array{
     *   channelReconnect: bool,
     *   postFailed: bool,
     *   postPublished: bool,
     *   postUnconfirmed: bool,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelReconnect = $values['channelReconnect'];
        $this->postFailed = $values['postFailed'];
        $this->postPublished = $values['postPublished'];
        $this->postUnconfirmed = $values['postUnconfirmed'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
