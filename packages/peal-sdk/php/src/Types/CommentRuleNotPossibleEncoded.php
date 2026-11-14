<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Peal\Core\Json\JsonProperty;
use Peal\Core\Types\ArrayType;

class CommentRuleNotPossibleEncoded extends JsonSerializableType
{
    /**
     * @var value-of<CommentRuleNotPossibleEncodedTag> $tag
     */
    #[JsonProperty('_tag')]
    public string $tag;

    /**
     * @var ?string $code
     */
    #[JsonProperty('code')]
    public ?string $code;

    /**
     * @var ?string $message
     */
    #[JsonProperty('message')]
    public ?string $message;

    /**
     * @var ?string $requestId
     */
    #[JsonProperty('requestId')]
    public ?string $requestId;

    /**
     * @var array<ChannelCommentRule> $channels
     */
    #[JsonProperty('channels'), ArrayType([ChannelCommentRule::class])]
    public array $channels;

    /**
     * @var value-of<CommentRuleRefusal> $reason
     */
    #[JsonProperty('reason')]
    public string $reason;

    /**
     * @param array{
     *   tag: value-of<CommentRuleNotPossibleEncodedTag>,
     *   channels: array<ChannelCommentRule>,
     *   reason: value-of<CommentRuleRefusal>,
     *   code?: ?string,
     *   message?: ?string,
     *   requestId?: ?string,
     * } $values
     */
    public function __construct(
        array $values,
    ) {
        $this->tag = $values['tag'];
        $this->code = $values['code'] ?? null;
        $this->message = $values['message'] ?? null;
        $this->requestId = $values['requestId'] ?? null;
        $this->channels = $values['channels'];
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
