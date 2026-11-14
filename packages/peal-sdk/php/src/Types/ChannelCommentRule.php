<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class ChannelCommentRule extends JsonSerializableType
{
    /**
     * @var string $channelId
     */
    #[JsonProperty('channelId')]
    public string $channelId;

    /**
     * @var value-of<Platform> $platform
     */
    #[JsonProperty('platform')]
    public string $platform;

    /**
     * @var value-of<CommentRuleAbility> $reply
     */
    #[JsonProperty('reply')]
    public string $reply;

    /**
     * @param array{
     *   channelId: string,
     *   platform: value-of<Platform>,
     *   reply: value-of<CommentRuleAbility>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channelId = $values['channelId'];
        $this->platform = $values['platform'];
        $this->reply = $values['reply'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
