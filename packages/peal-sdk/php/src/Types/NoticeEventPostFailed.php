<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;

class NoticeEventPostFailed extends JsonSerializableType
{
    /**
     * @var ?NoticeChannel $channel
     */
    #[JsonProperty('channel')]
    public ?NoticeChannel $channel;

    /**
     * @var ?value-of<PostPartsNotSent> $notSent
     */
    #[JsonProperty('notSent')]
    public ?string $notSent;

    /**
     * @var string $postId
     */
    #[JsonProperty('postId')]
    public string $postId;

    /**
     * @var value-of<FailureReason> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   postId: string,
     *   reason: value-of<FailureReason>,
     *   channel?: ?NoticeChannel,
     *   notSent?: ?value-of<PostPartsNotSent>,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->channel = $values['channel'] ?? null;
        $this->notSent = $values['notSent'] ?? null;
        $this->postId = $values['postId'];
        $this->reason = $values['reason'];
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }
}
