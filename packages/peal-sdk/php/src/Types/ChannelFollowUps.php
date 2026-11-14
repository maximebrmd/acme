<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelFollowUps extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var value-of<FollowUpAbility> $comment
     */
    #[JsonProperty('comment')]
    public string $comment;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var value-of<FollowUpAbility> $repost
     */
    #[JsonProperty('repost')]
    public string $repost;

    /**
     * @param array{
     *   channelId: string,
     *   comment: value-of<FollowUpAbility>,
     *   platform: value-of<Platform>,
     *   repost: value-of<FollowUpAbility>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->comment = $values['comment'];
        $this->platform = $values['platform'];
        $this->repost = $values['repost'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
